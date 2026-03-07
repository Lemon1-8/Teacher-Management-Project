<template>
  <div class="training-detail-container" v-loading="loading">
    <el-page-header @back="router.back()">
      <template #content>
        <span class="text-large font-600 mr-3"> 培训详情 </span>
      </template>
    </el-page-header>

    <el-row :gutter="20" class="mt-20" v-if="training">
      <el-col :span="16">
        <el-card shadow="never">
          <div class="detail-header">
            <h1>{{ training.title }}</h1>
            <div class="meta-info">
              <el-tag :type="getStatusType(training.status)">{{ getStatusLabel(training.status) }}</el-tag>
              <span class="type-badge">{{ training.training_type?.name }}</span>
              <span class="author">主讲人：{{ training.speaker }}</span>
            </div>
          </div>

          <div class="section-title">培训介绍</div>
          <div class="rich-text">{{ training.description }}</div>

          <template v-if="training.isEnrolled && training.enrollmentStatus !== 'pending'">
            <div class="section-title">学习资源</div>
            <div class="learning-resources">
              <el-table :data="training.materials || []" border style="width: 100%">
                <el-table-column prop="name" label="资料名称" />
                <el-table-column label="操作" width="150" align="center">
                  <template #default="{ row }">
                    <el-button type="primary" link @click="handlePreview(row)">预览</el-button>
                    <el-button type="success" link @click="handleDownload(row)">下载</el-button>
                  </template>
                </el-table-column>
              </el-table>
              <div v-if="!training.materials || training.materials.length === 0" class="no-data">暂无在线资料</div>
            </div>
          </template>

          <div class="section-title" v-if="training.content">详细内容</div>
          <div class="rich-text" v-html="training.content"></div>

          <div class="section-title" v-if="training.speaker_intro">主讲人介绍</div>
          <div class="rich-text">{{ training.speaker_intro }}</div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="never" class="side-card">
          <img :src="training.cover || 'https://img.js.design/assets/img/6596956f70932c0d57571343.png'" class="detail-image" />
          <div class="side-info">
            <p><el-icon><Calendar /></el-icon> 时间：{{ formatDateRange(training.start_time, training.end_time) }}</p>
            <p><el-icon><Location /></el-icon> 地点：{{ training.location }}</p>
            <p><el-icon><User /></el-icon> 名额：{{ training.current_students }}/{{ training.max_students }}</p>
            <p><el-icon><Timer /></el-icon> 学时：{{ training.total_hours }}</p>
            <div class="actions" v-if="!isAdmin && !isTrainer">
              <el-button 
                type="primary" 
                size="large" 
                block 
                :disabled="training.isEnrolled || training.current_students >= training.max_students || training.status !== 'published'" 
                @click="handleEnroll"
              >
                {{ training.isEnrolled ? (training.enrollmentStatus === 'pending' ? '审核中' : '已报名') : '立即报名' }}
              </el-button>
              
              <!-- 签到按钮 -->
              <el-button 
                v-if="training.isEnrolled && training.enrollmentStatus === 'approved'" 
                type="success" 
                size="large" 
                block 
                @click="handleAttendance"
              >
                考勤签到
              </el-button>

              <!-- 证书下载按钮 -->
              <el-button 
                v-if="training.enrollmentStatus === 'completed'" 
                type="warning" 
                size="large" 
                block 
                @click="handleDownloadCert"
              >
                查看/下载证书
              </el-button>

              <el-button v-if="training.isEnrolled && training.enrollmentStatus === 'pending'" type="danger" size="large" plain block @click="handleCancelEnroll">
                取消报名
              </el-button>

              <!-- 联系讲师 -->
              <el-button type="info" size="large" plain block class="mt-10" @click="handleContactTrainer">
                联系讲师
              </el-button>
            </div>
            <div class="actions" v-else>
              <el-button type="primary" size="large" block @click="router.push('/training/audit?id=' + training.id)">
                管理报名
              </el-button>
              <el-button type="success" size="large" block class="mt-10" @click="handleCreateExam">
                发布考试
              </el-button>
            </div>
          </div>
        </el-card>

        <el-card shadow="never" class="mt-20" v-if="training.materials && training.materials.length > 0">
          <template #header>
            <div class="card-header">
              <span>资料下载</span>
            </div>
          </template>
          <div class="file-list">
            <div v-for="(file, index) in training.materials" :key="index" class="file-item">
              <span class="file-name"><el-icon><Document /></el-icon> {{ file.name }}</span>
              <div class="file-actions">
                <el-button type="primary" link size="small" @click="handlePreview(file)">
                  <el-icon><View /></el-icon>
                </el-button>
                <el-button type="success" link size="small" @click="handleDownload(file)">
                  <el-icon><Download /></el-icon>
                </el-button>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
    <el-empty v-else-if="!loading" description="未找到培训详情" />

    <!-- 考试表单弹窗 -->
    <el-dialog v-model="examDialogVisible" title="发布考试" width="600px">
      <el-form :model="examForm" label-width="100px" ref="examFormRef" :rules="examRules">
        <el-form-item label="考试标题" prop="title">
          <el-input v-model="examForm.title" placeholder="请输入考试标题" />
        </el-form-item>
        <el-form-item label="考试时长" prop="duration">
          <el-input-number v-model="examForm.duration" :min="1" style="width: 100%" />
        </el-form-item>
        <el-form-item label="总分" prop="total_score">
          <el-input-number v-model="examForm.total_score" :min="1" style="width: 100%" />
        </el-form-item>
        <el-form-item label="及格分" prop="pass_score">
          <el-input-number v-model="examForm.pass_score" :min="1" style="width: 100%" />
        </el-form-item>
        <el-form-item label="有效时间" prop="timeRange">
          <el-date-picker
            v-model="examForm.timeRange"
            type="datetimerange"
            range-separator="至"
            start-placeholder="开始时间"
            end-placeholder="结束时间"
            value-format="YYYY-MM-DD HH:mm:ss"
            style="width: 100%"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="examDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitExamForm">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, reactive } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox, FormInstance } from 'element-plus'
import { getTrainingDetail, enrollTraining, cancelEnroll, attendance, getCertificate } from '../../api/training'
import { createExam } from '../../api/exam'
import { useUserStore } from '../../stores/user'
import { Calendar, Location, User, Timer, Document, View, Download } from '@element-plus/icons-vue'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const loading = ref(false)
const training = ref<any>(null)

const isAdmin = computed(() => userStore.userInfo?.role === 'admin')
const isTrainer = computed(() => userStore.userInfo?.role === 'trainer')

// 联系讲师
const handleContactTrainer = () => {
  if (training.value?.creator) {
    router.push({
      path: '/message',
      query: {
        targetId: training.value.created_by,
        targetName: training.value.speaker || training.value.creator.username
      }
    })
  } else {
    ElMessage.warning('无法获取讲师信息')
  }
}

// 考试相关
const examDialogVisible = ref(false)
const examFormRef = ref<FormInstance>()
const examForm = reactive({
  title: '',
  duration: 60,
  pass_score: 60,
  total_score: 100,
  timeRange: [] as string[],
  status: 'published',
  training_id: undefined as number | undefined
})
const examRules = {
  title: [{ required: true, message: '请输入考试标题', trigger: 'blur' }],
  duration: [{ required: true, message: '请输入考试时长', trigger: 'blur' }],
  pass_score: [{ required: true, message: '请输入及格分数', trigger: 'blur' }],
  total_score: [{ required: true, message: '请输入总分', trigger: 'blur' }],
  timeRange: [{ required: true, message: '请选择有效时间', trigger: 'change' }]
}

const handleCreateExam = () => {
  examForm.title = training.value.title + ' - 结业考试'
  examForm.training_id = training.value.id
  // 默认考试时间：从现在开始，持续到培训结束时间后7天（或者如果培训已结束，就从现在开始）
  const startTime = new Date()
  const endTime = training.value.end_time 
    ? new Date(new Date(training.value.end_time).getTime() + 7 * 24 * 3600 * 1000) 
    : new Date(Date.now() + 7 * 24 * 3600 * 1000)
    
  examForm.timeRange = [
    startTime.toISOString(), 
    endTime.toISOString()
  ]
  examDialogVisible.value = true
}

const submitExamForm = async () => {
  if (!examFormRef.value) return
  await examFormRef.value.validate(async (valid) => {
    if (valid) {
      const data = {
        ...examForm,
        start_time: examForm.timeRange && examForm.timeRange[0] ? examForm.timeRange[0] : null,
        end_time: examForm.timeRange && examForm.timeRange[1] ? examForm.timeRange[1] : null
      }
      
      try {
        await createExam({ ...data, questions: [] })
        ElMessage.success('考试发布成功，请前往考试管理添加试题')
        examDialogVisible.value = false
        // 可选：跳转到题目管理页面
        // router.push('/exam/questions/' + res.id) 
      } catch (error) {
        console.error('Create exam failed:', error)
      }
    }
  })
}

// 检查下载权限
const canDownload = computed(() => {
  if (isAdmin.value || isTrainer.value) return true // 管理员和讲师拥有所有权限
  if (!training.value) return false 
  // 注意：training 是 ref 对象，访问其属性需要使用 .value，但这里已经是 training.value 了
  // 问题可能出在 enrollmentStatus 的拼写或结构上，或者是 isEnrolled
  // 让我们打印一下日志以便调试 (生产环境可移除)
  console.log('Permission check:', training.value)
  return training.value.isEnrolled && training.value.enrollmentStatus === 'approved'
})

// 预览资源
const handlePreview = (file: any) => {
  if (!canDownload.value) {
    return ElMessage.warning('请先报名并等待审核通过后查看资料')
  }
  if (file.url) {
    window.open(file.url, '_blank')
  } else {
    ElMessage.warning('该文件暂不支持在线预览')
  }
}

// 下载资源
const handleDownload = async (file: any) => {
  if (!canDownload.value) {
    return ElMessage.warning('请先报名并等待审核通过后下载资料')
  }
  if (file.url) {
    try {
      ElMessage.info('开始下载...')
      const response = await fetch(file.url)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', file.name)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Download error:', error)
      // 如果 fetch 失败（例如 CORS 虽配置但依然受阻），回退到原有的直接打开方式
      window.open(file.url, '_blank')
    }
  }
}

// 签到逻辑
const handleAttendance = async () => {
  try {
    // 这里可以加入地理位置校验逻辑
    await attendance(training.value.enrollmentId || training.value.id) 
    ElMessage.success('签到成功！学时已自动记入您的账户。')
    fetchData() // 刷新状态
  } catch (error: any) {
    console.error('Attendance failed:', error)
  }
}

// 下载证书
const handleDownloadCert = async () => {
  try {
    const res: any = await getCertificate(training.value.enrollmentId || training.value.id)
    if (res.url) {
      window.open(res.url, '_blank')
    }
  } catch (error) {
    console.error('Download cert failed:', error)
  }
}

const fetchData = async () => {
  const id = route.params.id as string
  loading.value = true
  try {
    const res: any = await getTrainingDetail(id)
    training.value = res
  } catch (error) {
    console.error('Failed to fetch training detail:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchData()
})

const getStatusType = (status: string) => {
  const map: Record<string, string> = {
    draft: 'info',
    published: 'success',
    ended: 'danger',
    cancelled: 'info'
  }
  return map[status] || 'info'
}

const getStatusLabel = (status: string) => {
  const map: Record<string, string> = {
    draft: '草稿',
    published: '已发布',
    ended: '已结束',
    cancelled: '已取消'
  }
  return map[status] || status
}

const formatDateRange = (start: string, end: string) => {
  if (!start) return '时间待定'
  const s = new Date(start).toLocaleString()
  const e = end ? new Date(end).toLocaleString() : ''
  return e ? `${s} 至 ${e}` : s
}

const handleEnroll = async () => {
  try {
    await enrollTraining(training.value.id)
    ElMessage.success('报名申请已提交')
    fetchData()
  } catch (error) {
    console.error('Enroll failed:', error)
  }
}

const handleCancelEnroll = () => {
  ElMessageBox.confirm('确定取消报名吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      await cancelEnroll(training.value.id)
      ElMessage.success('已取消报名')
      fetchData()
    } catch (error) {
      console.error('Cancel enroll failed:', error)
    }
  })
}
</script>

<style scoped>
.training-detail-container {
  padding: 20px;
}

.mt-20 {
  margin-top: 20px;
}

.detail-header {
  margin-bottom: 20px;
}

.detail-header h1 {
  margin-top: 0;
  margin-bottom: 15px;
  font-size: 24px;
}

.meta-info {
  display: flex;
  align-items: center;
  gap: 15px;
  color: #909399;
  font-size: 14px;
}

.type-badge {
  color: #409EFF;
  font-weight: bold;
}

.section-title {
  font-size: 18px;
  font-weight: bold;
  margin: 30px 0 15px;
  padding-left: 10px;
  border-left: 4px solid #409EFF;
}

.file-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
  padding: 5px;
  border-radius: 4px;
}

.file-item:hover {
  background-color: #f5f7fa;
}

.file-name {
  display: flex;
  align-items: center;
  gap: 5px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  margin-right: 10px;
}

.file-actions {
  display: flex;
  gap: 5px;
}

.learning-resources {
  margin-bottom: 20px;
}

.no-data {
  text-align: center;
  color: #909399;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 4px;
}

.rich-text {
  line-height: 1.8;
  color: #303133;
  white-space: pre-wrap;
}

.detail-image {
  width: 100%;
  height: 200px;
  object-fit: cover;
  border-radius: 4px;
}

.side-info {
  margin-top: 20px;
}

.side-info p {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #606266;
  margin-bottom: 15px;
}

.actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 20px;
}

.file-item {
  margin-bottom: 10px;
}

:deep(.el-button--block) {
  width: 100%;
  margin-left: 0;
}
</style>

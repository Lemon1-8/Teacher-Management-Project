<template>
  <div class="exam-list-container" v-loading="loading">
    <!-- 
    <div class="action-bar" v-if="canManage">
      <el-button type="success" @click="handleAdd">发布考试</el-button>
    </div>
    -->

    <el-row :gutter="20">
      <el-col :span="12" v-for="item in examList" :key="item.id" class="mb-20">
        <el-card shadow="hover">
          <div class="exam-header">
            <span class="exam-title">{{ item.title }}</span>
            <el-tag :type="getStatusType(item.status)">{{ getStatusLabel(item.status) }}</el-tag>
          </div>
          <div class="exam-body">
            <p><el-icon><Timer /></el-icon> 考试时长：{{ item.duration }} 分钟</p>
            <p><el-icon><Check /></el-icon> 及格分数：{{ item.pass_score }} / {{ item.total_score }}</p>
            <p><el-icon><Calendar /></el-icon> 有效期：{{ formatDateRange(item.start_time, item.end_time) }}</p>
          </div>
          <div class="exam-footer">
            <template v-if="canManage">
              <el-button type="info" size="small" @click="router.push('/exam/results/' + item.id)">成绩管理</el-button>
              <el-button type="success" size="small" @click="goQuestionManage(item)">题目管理</el-button>
              <el-button type="primary" size="small" @click="handleEdit(item)">编辑</el-button>
              <el-button type="danger" size="small" @click="handleDelete(item)">删除</el-button>
            </template>
            <template v-else>
              <template v-if="item.userStatus === 'passed'">
                <el-tag type="success">已通过 ({{ item.userScore }}分)</el-tag>
              </template>
              <template v-else>
                <span v-if="item.userStatus === 'failed'" class="score-tip text-danger">上次得分: {{ item.userScore }} (未及格)</span>
                <el-button type="primary" :disabled="item.status !== 'published'" @click="goStartExam(item)">
                  {{ item.userStatus === 'failed' ? '再试一次' : '开始考试' }}
                </el-button>
              </template>
            </template>
          </div>
        </el-card>
      </el-col>
    </el-row>
    <el-empty v-if="examList.length === 0" description="暂无考试" />

    <!-- 考试表单弹窗 -->
    <el-dialog v-model="dialogVisible" :title="dialogType === 'add' ? '发布考试' : '编辑考试'" width="600px">
      <el-form :model="form" label-width="100px" ref="formRef" :rules="rules">
        <el-form-item label="考试标题" prop="title">
          <el-input v-model="form.title" placeholder="请输入考试标题" />
        </el-form-item>
        <el-form-item label="考试时长" prop="duration">
          <el-input-number v-model="form.duration" :min="1" style="width: 100%" />
        </el-form-item>
        <el-form-item label="总分" prop="total_score">
          <el-input-number v-model="form.total_score" :min="1" style="width: 100%" />
        </el-form-item>
        <el-form-item label="及格分" prop="pass_score">
          <el-input-number v-model="form.pass_score" :min="1" style="width: 100%" />
        </el-form-item>
        <el-form-item label="有效时间" prop="timeRange">
          <el-date-picker
            v-model="form.timeRange"
            type="datetimerange"
            range-separator="至"
            start-placeholder="开始时间"
            end-placeholder="结束时间"
            value-format="YYYY-MM-DD HH:mm:ss"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="状态" v-if="dialogType === 'edit'">
          <el-select v-model="form.status" style="width: 100%">
            <el-option label="草稿" value="draft" />
            <el-option label="已发布" value="published" />
            <el-option label="已结束" value="ended" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox, FormInstance } from 'element-plus'
import { useUserStore } from '../../stores/user'
import { getExamList, createExam, updateExam, deleteExam } from '../../api/exam'

const router = useRouter()
const userStore = useUserStore()
const isAdmin = computed(() => userStore.userInfo?.role === 'admin')
const isTrainer = computed(() => userStore.userInfo?.role === 'trainer')
const canManage = computed(() => isAdmin.value || isTrainer.value)

const loading = ref(false)
const examList = ref<any[]>([])

const fetchData = async () => {
  loading.value = true
  try {
    const res: any = await getExamList({
      page: 1,
      limit: 100
    })
    examList.value = res.list
  } catch (error) {
    console.error('Failed to fetch exams:', error)
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
    upcoming: 'warning',
    published: 'success',
    ended: 'danger'
  }
  return map[status] || 'info'
}

const getStatusLabel = (status: string) => {
  const map: Record<string, string> = {
    draft: '草稿',
    upcoming: '未开始',
    published: '进行中',
    ended: '已结束'
  }
  return map[status] || status
}

const formatDateRange = (start: string, end: string) => {
  if (!start) return '永久有效'
  const s = new Date(start).toLocaleDateString()
  const e = end ? new Date(end).toLocaleDateString() : ''
  return e ? `${s} 至 ${e}` : s
}

const goStartExam = (item: any) => {
  router.push(`/exam/online/${item.id}`)
}

const goQuestionManage = (item: any) => {
  router.push(`/exam/questions/${item.id}`)
}

// 弹窗相关逻辑
const dialogVisible = ref(false)
const dialogType = ref<'add' | 'edit'>('add')
const formRef = ref<FormInstance>()
const form = reactive({
  id: undefined as number | undefined,
  title: '',
  duration: 60,
  pass_score: 60,
  total_score: 100,
  timeRange: [] as string[],
  status: 'published'
})

const rules = {
  title: [{ required: true, message: '请输入考试标题', trigger: 'blur' }],
  duration: [{ required: true, message: '请输入时长', trigger: 'blur' }],
  total_score: [{ required: true, message: '请输入总分', trigger: 'blur' }],
  pass_score: [{ required: true, message: '请输入及格分', trigger: 'blur' }],
  timeRange: [{ required: true, message: '请选择有效时间', trigger: 'change' }]
}

const handleAdd = () => {
  dialogType.value = 'add'
  Object.assign(form, {
    id: undefined,
    title: '',
    duration: 60,
    pass_score: 60,
    total_score: 100,
    timeRange: [],
    status: 'published'
  })
  dialogVisible.value = true
}

const handleEdit = (item: any) => {
  dialogType.value = 'edit'
  Object.assign(form, {
    ...item,
    timeRange: item.start_time && item.end_time ? [item.start_time, item.end_time] : []
  })
  dialogVisible.value = true
}

const handleDelete = (item: any) => {
  ElMessageBox.confirm(`确定删除考试“${item.title}”吗？关联的题目也会被删除。`, '警告', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      await deleteExam(item.id)
      ElMessage.success('删除成功')
      fetchData()
    } catch (error) {
      console.error('Delete exam failed:', error)
    }
  })
}

const submitForm = async () => {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (valid) {
      const data = {
        ...form,
        start_time: form.timeRange && form.timeRange[0] ? form.timeRange[0] : null,
        end_time: form.timeRange && form.timeRange[1] ? form.timeRange[1] : null
      }
      
      // 前端简单校验
      if (data.start_time && data.end_time) {
        if (new Date(data.end_time) <= new Date(data.start_time)) {
          return ElMessage.warning('结束时间必须晚于开始时间')
        }
      }
      try {
        if (dialogType.value === 'add') {
          // 确保传递 questions 字段（即使为空数组），因为后端可能期待这个字段
          await createExam({ ...data, questions: [] })
          ElMessage.success('创建成功')
        } else {
          await updateExam(form.id!, data)
          ElMessage.success('更新成功')
        }
        dialogVisible.value = false
        fetchData()
      } catch (error) {
        // 错误已在 request.ts 拦截器中处理
        console.error('Submit exam failed:', error)
      }
    }
  })
}
</script>

<style scoped>
.exam-list-container {
  padding: 20px;
}

.action-bar {
  margin-bottom: 20px;
}

.mb-20 {
  margin-bottom: 20px;
}

.exam-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.exam-title {
  font-size: 18px;
  font-weight: bold;
}

.exam-body p {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #606266;
  margin-bottom: 10px;
}

.exam-footer {
  margin-top: 20px;
  padding-top: 15px;
  border-top: 1px solid #ebeef5;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
.score-tip {
  margin-right: 10px;
  font-size: 13px;
}
.text-danger {
  color: #F56C6C;
}
</style>

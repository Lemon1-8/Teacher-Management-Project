<template>
  <div class="training-list-container">
    <el-card shadow="hover" class="filter-card">
      <el-form :inline="true" :model="filters">
        <el-form-item label="培训名称">
          <el-input v-model="filters.keyword" placeholder="请输入培训名称" clearable />
        </el-form-item>
        <el-form-item label="类型">
          <el-select v-model="filters.type_id" placeholder="请选择类型" clearable style="width: 150px">
            <el-option v-for="type in trainingTypes" :key="type.id" :label="type.name" :value="type.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="filters.status" placeholder="请选择状态" clearable style="width: 120px">
            <el-option label="草稿" value="draft" />
            <el-option label="已发布" value="published" />
            <el-option label="已结束" value="ended" />
            <el-option label="已取消" value="cancelled" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">查询</el-button>
          <el-button @click="resetFilters">重置</el-button>
          <el-button v-if="canManage" type="success" @click="handleAdd">发布培训</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <div class="card-list" v-loading="loading">
      <el-row :gutter="20">
        <el-col :span="8" v-for="item in trainingList" :key="item.id" class="mb-20">
          <el-card :body-style="{ padding: '0px' }" shadow="hover">
            <div class="image-wrapper">
              <img :src="item.cover || 'https://img.js.design/assets/img/6596956f70932c0d57571343.png'" class="image" />
            </div>
            <div style="padding: 14px">
              <div class="title">{{ item.title }}</div>
              <div class="info">
                <el-tag size="small" :type="getStatusType(item.status)">{{ getStatusLabel(item.status) }}</el-tag>
                <span class="type">{{ item.training_type?.name }}</span>
              </div>
              <div class="time"><el-icon><Calendar /></el-icon> {{ formatDateRange(item.start_time, item.end_time) }}</div>
              <div class="location"><el-icon><Location /></el-icon> {{ item.location }}</div>
              <div class="bottom">
                <span class="enrollment">名额：{{ item.current_students }}/{{ item.max_students }}</span>
                <div class="btns">
                  <el-button type="primary" size="small" link @click="goDetail(item.id)">详情</el-button>
                  <template v-if="isAdmin || (isTrainer && item.created_by === userStore.userInfo?.id)">
                    <el-button type="warning" size="small" link @click="handleEdit(item)">编辑</el-button>
                    <el-button type="danger" size="small" link @click="handleDelete(item)">删除</el-button>
                  </template>
                  <el-button v-else type="success" size="small" :disabled="item.current_students >= item.max_students || item.status !== 'published' || item.isEnrolled" @click="handleEnroll(item)">
                    {{ item.isEnrolled ? (item.enrollmentStatus === 'pending' ? '审核中' : '已报名') : '报名' }}
                  </el-button>
                </div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
      <el-empty v-if="trainingList.length === 0" description="暂无数据" />
    </div>

    <!-- 培训表单弹窗 -->
    <el-dialog v-model="dialogVisible" :title="dialogType === 'add' ? '发布培训' : '编辑培训'" width="700px">
      <el-form :model="form" label-width="100px" ref="formRef" :rules="rules">
        <el-form-item label="培训标题" prop="title">
          <el-input v-model="form.title" placeholder="请输入培训标题" />
        </el-form-item>
        <el-form-item label="培训类型" prop="type_id">
          <el-select v-model="form.type_id" placeholder="请选择类型" style="width: 100%">
            <el-option v-for="type in trainingTypes" :key="type.id" :label="type.name" :value="type.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="培训时间" prop="timeRange">
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
        <el-form-item label="培训地点" prop="location">
          <el-input v-model="form.location" placeholder="请输入培训地点" />
        </el-form-item>
        <el-form-item label="学时" prop="total_hours">
          <el-input-number v-model="form.total_hours" :min="0" :precision="1" :step="0.5" />
        </el-form-item>
        <el-form-item label="总名额" prop="max_students">
          <el-input-number v-model="form.max_students" :min="1" style="width: 100%" />
        </el-form-item>
        <el-form-item label="主讲人" prop="speaker">
          <el-input v-model="form.speaker" placeholder="请输入主讲人" />
        </el-form-item>
        <el-form-item label="培训介绍" prop="description">
          <el-input v-model="form.description" type="textarea" placeholder="请输入培训介绍" />
        </el-form-item>
        <el-form-item label="封面图">
          <el-upload
            class="avatar-uploader"
            action="#"
            :show-file-list="false"
            :auto-upload="false"
            :on-change="handleCoverChange"
          >
            <img v-if="form.cover" :src="form.cover" class="avatar" />
            <el-icon v-else class="avatar-uploader-icon"><Plus /></el-icon>
          </el-upload>
          <div class="el-upload__tip">建议尺寸 800x450px，支持 jpg/png 格式</div>
        </el-form-item>
        <el-form-item label="培训资料">
          <el-upload
            action="#"
            multiple
            :auto-upload="false"
            :file-list="materialFileList"
            :on-change="handleMaterialChange"
            :on-remove="handleMaterialRemove"
          >
            <el-button type="primary" size="small">选择文件</el-button>
            <template #tip>
              <div class="el-upload__tip">支持 pdf/doc/ppt/zip/mp4 等格式，单个文件不超过 500MB</div>
            </template>
          </el-upload>
        </el-form-item>
        <el-form-item label="状态" v-if="dialogType === 'edit'">
          <el-select v-model="form.status" style="width: 100%">
            <el-option label="草稿" value="draft" />
            <el-option label="已发布" value="published" />
            <el-option label="已结束" value="ended" />
            <el-option label="已取消" value="cancelled" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm">确定</el-button>
      </template>
    </el-dialog>

    <div class="pagination">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="[9, 18, 36, 90]"
        layout="total, sizes, prev, pager, next, jumper"
        :total="total"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox, FormInstance } from 'element-plus'
import { useUserStore } from '../../stores/user'
import { 
  getTrainingList, 
  getTrainingTypes, 
  createTraining, 
  updateTraining, 
  deleteTraining, 
  enrollTraining 
} from '../../api/training'
import { uploadFile } from '../../api/file'

const router = useRouter()
const userStore = useUserStore()

const isAdmin = computed(() => userStore.userInfo?.role === 'admin')
const isTrainer = computed(() => userStore.userInfo?.role === 'trainer')
const canManage = computed(() => isAdmin.value || isTrainer.value)

const loading = ref(false)
const filters = reactive({
  keyword: '',
  type_id: undefined as number | undefined,
  status: ''
})

const trainingList = ref<any[]>([])
const trainingTypes = ref<any[]>([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(9)

const fetchData = async () => {
  loading.value = true
  try {
    const res: any = await getTrainingList({
      page: currentPage.value,
      limit: pageSize.value,
      ...filters
    })
    trainingList.value = res.list
    total.value = res.total
  } catch (error) {
    console.error('Failed to fetch trainings:', error)
  } finally {
    loading.value = false
  }
}

const fetchTypes = async () => {
  try {
    const res: any = await getTrainingTypes()
    trainingTypes.value = res
  } catch (error) {
    console.error('Failed to fetch training types:', error)
  }
}

onMounted(() => {
  fetchData()
  fetchTypes()
})

const handleSearch = () => {
  currentPage.value = 1
  fetchData()
}

const resetFilters = () => {
  Object.assign(filters, {
    keyword: '',
    type_id: undefined,
    status: ''
  })
  handleSearch()
}

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
  const s = new Date(start).toLocaleDateString()
  const e = end ? new Date(end).toLocaleDateString() : ''
  return e ? `${s} 至 ${e}` : s
}

const goDetail = (id: number) => {
  router.push(`/training/detail/${id}`)
}

// 弹窗相关逻辑
const dialogVisible = ref(false)
const dialogType = ref<'add' | 'edit'>('add')
const formRef = ref<FormInstance>()
const form = reactive({
  id: undefined as number | undefined,
  title: '',
  type_id: undefined as number | undefined,
  timeRange: [] as string[],
  location: '',
  max_students: 50,
  total_hours: 2,
  speaker: '',
  description: '',
  cover: '',
  materials: [] as any[],
  status: 'published'
})

// 文件上传相关
const materialFileList = ref<any[]>([])

const handleCoverChange = async (file: any) => {
  try {
    const res: any = await uploadFile(file.raw, 'covers')
    form.cover = res.url
    ElMessage.success('封面上传成功')
  } catch (error) {
    ElMessage.error('封面上传失败')
  }
}

const handleMaterialChange = async (file: any, fileList: any[]) => {
  // 排除掉已经上传成功并在列表中的
  if (file.status === 'ready') {
    try {
      const res: any = await uploadFile(file.raw, 'materials')
      form.materials.push({
        name: res.name,
        url: res.url,
        size: res.size
      })
      ElMessage.success(`${res.name} 上传成功`)
    } catch (error) {
      ElMessage.error(`${file.name} 上传失败`)
      // 从列表中移除失败的文件
      const index = fileList.indexOf(file)
      if (index > -1) fileList.splice(index, 1)
    }
  }
  materialFileList.value = fileList
}

const handleMaterialRemove = (file: any) => {
  const index = form.materials.findIndex(m => m.url === file.url || m.name === file.name)
  if (index > -1) {
    form.materials.splice(index, 1)
  }
}

const rules = {
  title: [{ required: true, message: '请输入培训标题', trigger: 'blur' }],
  type_id: [{ required: true, message: '请选择培训类型', trigger: 'change' }],
  timeRange: [{ required: true, message: '请选择培训时间', trigger: 'change' }],
  location: [{ required: true, message: '请输入培训地点', trigger: 'blur' }],
  max_students: [{ required: true, message: '请输入总名额', trigger: 'blur' }]
}

const handleAdd = () => {
  dialogType.value = 'add'
  materialFileList.value = []
  Object.assign(form, {
    id: undefined,
    title: '',
    type_id: undefined,
    timeRange: [],
    location: '',
    max_students: 50,
    total_hours: 2,
    speaker: isTrainer.value ? (userStore.userInfo?.name || userStore.userInfo?.username || '') : '',
    description: '',
    cover: '',
    materials: [],
    status: 'published'
  })
  dialogVisible.value = true
}

const handleEdit = (row: any) => {
  dialogType.value = 'edit'
  materialFileList.value = (row.materials || []).map((m: any) => ({
    name: m.name,
    url: m.url
  }))
  Object.assign(form, {
    id: row.id,
    title: row.title,
    type_id: row.type_id,
    timeRange: [row.start_time, row.end_time],
    location: row.location,
    max_students: row.max_students,
    total_hours: row.total_hours,
    speaker: row.speaker,
    description: row.description,
    cover: row.cover,
    materials: row.materials || [],
    status: row.status
  })
  dialogVisible.value = true
}

const submitForm = async () => {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (valid) {
      const data = {
        ...form,
        start_time: form.timeRange[0],
        end_time: form.timeRange[1]
      }
      try {
        if (dialogType.value === 'add') {
          await createTraining(data)
          ElMessage.success('发布成功')
        } else {
          await updateTraining(form.id!, data)
          ElMessage.success('更新成功')
        }
        dialogVisible.value = false
        fetchData()
      } catch (error) {
        // 错误已在 request.ts 拦截器中处理并显示
        console.error('Submit training failed:', error)
      }
    }
  })
}

const handleDelete = (row: any) => {
  ElMessageBox.confirm(`确定删除培训项目 "${row.title}" 吗？`, '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      await deleteTraining(row.id)
      ElMessage.success('删除成功')
      fetchData()
    } catch (error) {
      console.error('Delete training failed:', error)
    }
  })
}

const handleEnroll = async (row: any) => {
  try {
    await enrollTraining(row.id)
    ElMessage.success('报名申请已提交')
    fetchData()
  } catch (error) {
    console.error('Enroll failed:', error)
  }
}

const handleSizeChange = (val: number) => {
  pageSize.value = val
  fetchData()
}

const handleCurrentChange = (val: number) => {
  currentPage.value = val
  fetchData()
}
</script>

<style scoped>
.training-list-container {
  padding: 20px;
}

.filter-card {
  margin-bottom: 20px;
}

.card-list {
  min-height: 400px;
}

.image-wrapper {
  height: 180px;
  overflow: hidden;
}

.image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s;
}

.image:hover {
  transform: scale(1.05);
}

.title {
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 10px;
  height: 44px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.info {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.type {
  font-size: 12px;
  color: #909399;
}

.time, .location {
  font-size: 13px;
  color: #606266;
  margin-bottom: 5px;
  display: flex;
  align-items: center;
  gap: 5px;
}

.bottom {
  margin-top: 15px;
  padding-top: 15px;
  border-top: 1px solid #ebeef5;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.enrollment {
  font-size: 13px;
  color: #909399;
}

.mb-20 {
  margin-bottom: 20px;
}

.mt-20 {
  margin-top: 20px;
}

.pagination {
  margin-top: 30px;
  display: flex;
  justify-content: center;
}

.avatar-uploader {
  border: 1px dashed #d9d9d9;
  border-radius: 6px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  width: 178px;
  height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-uploader:hover {
  border-color: #409eff;
}

.avatar-uploader-icon {
  font-size: 28px;
  color: #8c939d;
}

.avatar {
  width: 178px;
  height: 100px;
  display: block;
  object-fit: cover;
}
</style>

<template>
  <div class="my-training-container" v-loading="loading">
    <el-tabs v-model="activeTab" class="training-tabs" @tab-change="handleTabChange">
      <el-tab-pane label="全部" name="all">
        <el-table :data="trainingList" style="width: 100%">
          <el-table-column prop="training.title" label="培训项目" min-width="200" />
          <el-table-column prop="training.start_time" label="开始时间" width="180">
            <template #default="{ row }">
              {{ row.training?.start_time ? new Date(row.training.start_time).toLocaleString() : '-' }}
            </template>
          </el-table-column>
          <el-table-column prop="status" label="状态" width="120">
            <template #default="{ row }">
              <el-tag :type="getStatusType(row.status)">{{ getStatusLabel(row.status) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="120">
            <template #default="{ row }">
              <el-button type="primary" size="small" link @click="goDetail(row.training.id)">详情</el-button>
              <el-button v-if="row.status === 'pending'" type="danger" size="small" link @click="handleCancel(row)">取消</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>
      <el-tab-pane label="待审核" name="pending">
        <el-table :data="trainingList.filter(item => item.status === 'pending')" style="width: 100%">
          <el-table-column prop="training.title" label="培训项目" min-width="200" />
          <el-table-column prop="training.start_time" label="培训时间" width="180">
            <template #default="{ row }">
              {{ row.training?.start_time ? new Date(row.training.start_time).toLocaleString() : '-' }}
            </template>
          </el-table-column>
          <el-table-column prop="enroll_time" label="申请时间" width="180">
            <template #default="{ row }">
              {{ new Date(row.enroll_time).toLocaleString() }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="120">
            <template #default="{ row }">
              <el-button type="danger" size="small" plain @click="handleCancel(row)">取消报名</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>
      <el-tab-pane label="已通过" name="approved">
        <el-table :data="trainingList.filter(item => item.status === 'approved')" style="width: 100%">
          <el-table-column prop="training.title" label="培训项目" min-width="200" />
          <el-table-column prop="training.start_time" label="培训时间" width="180">
            <template #default="{ row }">
              {{ row.training?.start_time ? new Date(row.training.start_time).toLocaleString() : '-' }}
            </template>
          </el-table-column>
          <el-table-column prop="training.location" label="地点" width="150" />
          <el-table-column label="操作" width="120">
            <template #default="{ row }">
              <el-button type="primary" size="small" @click="goDetail(row.training.id)">详情</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>
      <el-tab-pane label="已完成" name="completed">
        <el-table :data="trainingList.filter(item => item.status === 'completed')" style="width: 100%">
          <el-table-column prop="training.title" label="培训项目" min-width="200" />
          <el-table-column prop="training.total_hours" label="学时" width="100" />
          <el-table-column label="操作" width="120">
            <template #default="{ row }">
              <el-button type="success" size="small" v-if="!row.evaluation_score" @click="handleEvaluate(row)">去评估</el-button>
              <el-button type="info" size="small" plain disabled v-else>已评估</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>
    </el-tabs>

    <!-- 评估弹窗 -->
    <el-dialog v-model="evaluateVisible" title="培训项目评估" width="400px">
      <el-form :model="evaluateForm" label-width="80px">
        <el-form-item label="评分" required>
          <el-rate v-model="evaluateForm.score" :max="5" />
        </el-form-item>
        <el-form-item label="评语">
          <el-input v-model="evaluateForm.comment" type="textarea" placeholder="请输入您的评估内容" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="evaluateVisible = false">取消</el-button>
        <el-button type="primary" @click="submitEvaluation">提交评估</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getMyEnrollments, cancelEnroll } from '../../api/training'
import request from '../../utils/request'

const router = useRouter()
const activeTab = ref('all')
const loading = ref(false)
const trainingList = ref<any[]>([])

const fetchData = async () => {
  loading.value = true
  try {
    const res: any = await getMyEnrollments({
      status: activeTab.value === 'all' ? undefined : activeTab.value
    })
    trainingList.value = res
  } catch (error) {
    console.error('Failed to fetch my enrollments:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchData()
})

const handleTabChange = () => {
  fetchData()
}

const getStatusType = (status: string) => {
  const map: any = {
    pending: 'info',
    approved: 'primary',
    rejected: 'danger',
    completed: 'success',
    cancelled: 'info'
  }
  return map[status] || 'info'
}

const getStatusLabel = (status: string) => {
  const map: any = {
    pending: '待审核',
    approved: '已通过',
    rejected: '已拒绝',
    completed: '已完成',
    cancelled: '已取消'
  }
  return map[status] || status
}

const goDetail = (id: number) => {
  router.push(`/training/detail/${id}`)
}

const handleCancel = (row: any) => {
  ElMessageBox.confirm('确定取消该培训报名吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      await cancelEnroll(row.training.id)
      ElMessage.success('报名已取消')
      fetchData()
    } catch (error) {
      console.error('Cancel enroll failed:', error)
    }
  }).catch(() => {})
}

// 评估相关
const evaluateVisible = ref(false)
const currentEnrollmentId = ref<number | null>(null)
const evaluateForm = reactive({
  score: 5,
  comment: ''
})

const handleEvaluate = (row: any) => {
  currentEnrollmentId.value = row.id
  evaluateForm.score = 5
  evaluateForm.comment = ''
  evaluateVisible.value = true
}

const submitEvaluation = async () => {
  if (!currentEnrollmentId.value) return
  try {
    await request({
      url: `/enrollments/${currentEnrollmentId.value}/evaluate`,
      method: 'post',
      data: evaluateForm
    })
    ElMessage.success('感谢您的反馈！')
    evaluateVisible.value = false
    fetchData()
  } catch (error) {
    console.error('Submit evaluation failed:', error)
  }
}
</script>

<style scoped>
.my-training-container {
  background-color: #fff;
  padding: 20px;
  border-radius: 4px;
}
</style>

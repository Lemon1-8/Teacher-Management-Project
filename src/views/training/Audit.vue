<template>
  <div class="enrollment-audit-container">
    <el-card shadow="hover" class="filter-card">
      <el-form :inline="true" :model="filters">
        <el-form-item label="培训项目">
          <el-select v-model="filters.training_id" placeholder="全部培训" clearable style="width: 250px">
            <el-option v-for="item in trainingOptions" :key="item.id" :label="item.title" :value="item.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="filters.status" placeholder="全部状态" clearable style="width: 150px">
            <el-option label="全部" value="all" />
            <el-option label="待审核" value="pending" />
            <el-option label="已通过" value="approved" />
            <el-option label="已拒绝" value="rejected" />
            <el-option label="已完成" value="completed" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">查询</el-button>
          <el-button @click="resetFilters">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="hover" class="mt-20" v-loading="loading">
      <el-table :data="enrollmentList" stripe style="width: 100%">
        <el-table-column prop="user.employee_id" label="工号" width="120" />
        <el-table-column prop="user.username" label="姓名" width="120" />
        <el-table-column prop="user.department" label="部门" width="180" />
        <el-table-column prop="training.title" label="申请项目" min-width="200" />
        <el-table-column prop="enroll_time" label="申请时间" width="180">
          <template #default="{ row }">
            {{ new Date(row.enroll_time).toLocaleString() }}
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="120">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">{{ getStatusLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" align="center">
          <template #default="{ row }">
            <template v-if="row.status === 'pending'">
              <el-button type="success" size="small" link @click="handleAudit(row, 'approved')">通过</el-button>
              <el-button type="danger" size="small" link @click="handleAudit(row, 'rejected')">拒绝</el-button>
            </template>
            <span v-else>-</span>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch, computed } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getAllEnrollments, auditEnrollment, getTrainingList } from '../../api/training'
import { useUserStore } from '../../stores/user'

const route = useRoute()
const userStore = useUserStore()
const isAdmin = computed(() => userStore.userInfo?.role === 'admin')
const isTrainer = computed(() => userStore.userInfo?.role === 'trainer')

const loading = ref(false)
const enrollmentList = ref<any[]>([])
const trainingOptions = ref<any[]>([])

const filters = reactive({
  training_id: route.query.id ? parseInt(route.query.id as string) : undefined as number | undefined,
  status: (route.query.status as string) || 'pending'
})

// 监听路由参数变化 (用于从通知点击跳转过来)
watch(() => route.query, (newQuery) => {
  if (newQuery.id) {
    filters.training_id = parseInt(newQuery.id as string)
  }
  if (newQuery.status) {
    filters.status = newQuery.status as string
  }
  handleSearch()
})

const fetchTrainings = async () => {
  try {
    // 如果是讲师，后端会自动过滤只返回他创建的培训吗？
    // getTrainingList 接口目前是全量返回 (除非有 keyword/type 过滤)
    // 为了严谨，如果是讲师，这里应该只展示他负责的培训，但目前 getTrainingList 没加 created_by 过滤参数
    // 幸运的是，getAllEnrollments 接口后端已经加了权限过滤，所以列表数据是安全的
    // 这里的下拉框如果显示了别人的培训，查询结果也会是空的，影响不大，但为了体验最好过滤一下
    // 不过考虑到 getTrainingList 通用性，这里暂不改动后端，或者依靠后端 getAllEnrollments 的过滤结果来反推？
    // 简单起见，这里先不做额外过滤，依靠后端的数据安全性。
    const res: any = await getTrainingList({ page: 1, limit: 100 })
    
    // 前端过滤：如果是讲师，只显示自己创建的 (如果有 created_by 字段)
    // 目前 list 接口返回的数据包含 created_by 吗？如果不包含，则无法前端过滤
    // 假设后端 enrollment.controller.js 的 findAll 已经做了数据隔离，那么这里的下拉框只是筛选条件
    
    trainingOptions.value = res.list
  } catch (error) {
    console.error('Failed to fetch trainings:', error)
  }
}

const fetchData = async () => {
  // 权限检查
  if (!isAdmin.value && !isTrainer.value) {
    ElMessage.error('无权访问')
    return
  }

  loading.value = true
  try {
    const res: any = await getAllEnrollments(filters)
    enrollmentList.value = res
  } catch (error) {
    console.error('Failed to fetch enrollments:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchTrainings()
  fetchData()
})

const handleSearch = () => {
  fetchData()
}

const resetFilters = () => {
  filters.training_id = undefined
  filters.status = 'pending'
  handleSearch()
}

const getStatusType = (status: string) => {
  const map: any = { pending: 'info', approved: 'success', rejected: 'danger' }
  return map[status] || 'info'
}

const getStatusLabel = (status: string) => {
  const map: any = { pending: '待审核', approved: '已通过', rejected: '已拒绝', completed: '已完成' }
  return map[status] || status
}

const handleAudit = (row: any, status: 'approved' | 'rejected') => {
  const actionText = status === 'approved' ? '通过' : '拒绝'
  ElMessageBox.confirm(`确定${actionText}用户 "${row.user.username}" 的报名申请吗？`, '审核确认', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: status === 'approved' ? 'success' : 'warning'
  }).then(async () => {
    try {
      await auditEnrollment(row.id, status)
      ElMessage.success('操作成功')
      fetchData()
    } catch (error) {
      console.error('Audit failed:', error)
    }
  })
}
</script>

<style scoped>
.enrollment-audit-container {
  padding: 20px;
}
.filter-card {
  margin-bottom: 20px;
}
.mt-20 {
  margin-top: 20px;
}
</style>

<template>
  <div class="user-management-container">
    <el-card shadow="hover" class="filter-card">
      <el-form :inline="true" :model="filters">
        <el-form-item label="工号">
          <el-input v-model="filters.employee_id" placeholder="请输入工号" clearable />
        </el-form-item>
        <el-form-item label="姓名">
          <el-input v-model="filters.username" placeholder="请输入姓名" clearable />
        </el-form-item>
        <el-form-item label="部门">
          <el-input v-model="filters.department" placeholder="请输入部门" clearable />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">查询</el-button>
          <el-button @click="resetFilters">重置</el-button>
          <el-button type="success" @click="handleAdd">新增用户</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="hover" class="mt-20" v-loading="loading">
      <el-table :data="userList" stripe style="width: 100%">
        <el-table-column prop="employee_id" label="工号" width="120" />
        <el-table-column prop="username" label="姓名" width="120" />
        <el-table-column prop="department" label="部门" width="180" />
        <el-table-column prop="role" label="角色" width="120">
          <template #default="{ row }">
            <el-tag :type="row.role?.name === 'admin' ? 'danger' : 'success'">
              {{ row.role?.name === 'admin' ? '管理员' : (row.role?.name === 'trainer' ? '讲师' : '教师') }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-switch 
              v-model="row.status" 
              :active-value="1" 
              :inactive-value="0" 
              @change="handleStatusChange(row)" 
            />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" align="center">
          <template #default="{ row }">
            <el-button type="primary" link @click="handleEdit(row)">编辑</el-button>
            <el-button type="danger" link @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="pagination">
        <el-pagination 
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          layout="total, prev, pager, next" 
          :total="total" 
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <!-- 用户表单弹窗 -->
    <el-dialog v-model="dialogVisible" :title="dialogType === 'add' ? '新增用户' : '编辑用户'" width="500px">
      <el-form :model="form" label-width="80px" ref="formRef" :rules="rules">
        <el-form-item label="工号" prop="employee_id">
          <el-input v-model="form.employee_id" placeholder="请输入工号" :disabled="dialogType === 'edit'" />
        </el-form-item>
        <el-form-item label="姓名" prop="username">
          <el-input v-model="form.username" placeholder="请输入姓名" />
        </el-form-item>
        <el-form-item label="密码" prop="password" v-if="dialogType === 'add'">
          <el-input v-model="form.password" type="password" placeholder="请输入密码" show-password />
        </el-form-item>
        <el-form-item label="部门" prop="department">
          <el-input v-model="form.department" placeholder="请输入部门" />
        </el-form-item>
        <el-form-item label="角色" prop="role_id">
          <el-select v-model="form.role_id" placeholder="请选择角色" style="width: 100%">
            <el-option label="管理员" :value="1" />
            <el-option label="教师" :value="2" />
            <el-option label="讲师" :value="3" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="form.status">
            <el-radio :label="1">启用</el-radio>
            <el-radio :label="0">禁用</el-radio>
          </el-radio-group>
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
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox, FormInstance } from 'element-plus'
import { getUserList, createUser, updateUser, deleteUser } from '../../api/user'

const loading = ref(false)
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)
const userList = ref<any[]>([])

const filters = reactive({
  employee_id: '',
  username: '',
  department: ''
})

const fetchData = async () => {
  loading.value = true
  try {
    const res: any = await getUserList({
      page: currentPage.value,
      limit: pageSize.value,
      keyword: filters.username || filters.employee_id,
      department: filters.department
    })
    userList.value = res.list
    total.value = res.total
  } catch (error) {
    console.error('Failed to fetch users:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchData()
})

const handleSearch = () => {
  currentPage.value = 1
  fetchData()
}

const resetFilters = () => {
  filters.employee_id = ''
  filters.username = ''
  filters.department = ''
  handleSearch()
}

const dialogVisible = ref(false)
const dialogType = ref<'add' | 'edit'>('add')
const formRef = ref<FormInstance>()
const form = reactive({
  id: undefined as number | undefined,
  employee_id: '',
  username: '',
  password: '',
  department: '',
  role_id: 2,
  status: 1
})

const rules = {
  employee_id: [{ required: true, message: '请输入工号', trigger: 'blur' }],
  username: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
  role_id: [{ required: true, message: '请选择角色', trigger: 'change' }]
}

const handleAdd = () => {
  dialogType.value = 'add'
  Object.assign(form, {
    id: undefined,
    employee_id: '',
    username: '',
    password: '',
    department: '',
    role_id: 2,
    status: 1
  })
  dialogVisible.value = true
}

const handleEdit = (row: any) => {
  dialogType.value = 'edit'
  Object.assign(form, {
    id: row.id,
    employee_id: row.employee_id,
    username: row.username,
    department: row.department,
    role_id: row.role_id,
    status: row.status
  })
  dialogVisible.value = true
}

const submitForm = async () => {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (valid) {
      try {
        if (dialogType.value === 'add') {
          await createUser(form)
          ElMessage.success('创建成功')
        } else {
          await updateUser(form.id!, form)
          ElMessage.success('更新成功')
        }
        dialogVisible.value = false
        fetchData()
      } catch (error) {
        console.error('Submit user failed:', error)
      }
    }
  })
}

const handleStatusChange = async (row: any) => {
  try {
    await updateUser(row.id, { status: row.status })
    ElMessage.success(`用户 “${row.username}” 状态已更新`)
  } catch (error) {
    row.status = row.status === 1 ? 0 : 1 // 还原状态
    console.error('Update status failed:', error)
  }
}

const handleDelete = (row: any) => {
  ElMessageBox.confirm(`确定删除用户 “${row.username}” 吗？`, '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'error'
  }).then(async () => {
    try {
      await deleteUser(row.id)
      ElMessage.success('删除成功')
      fetchData()
    } catch (error) {
      console.error('Delete user failed:', error)
    }
  }).catch(() => {})
}

const handleCurrentChange = (val: number) => {
  currentPage.value = val
  fetchData()
}
</script>

<style scoped>
.user-management-container {
  padding: 20px;
}

.filter-card {
  margin-bottom: 20px;
}

.mt-20 {
  margin-top: 20px;
}

.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}
</style>

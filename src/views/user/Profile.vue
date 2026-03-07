<template>
  <div class="profile-container" v-loading="loading">
    <el-card shadow="hover">
      <template #header>
        <div class="card-header">
          <span>个人信息管理</span>
        </div>
      </template>
      <el-form :model="userForm" label-width="100px" style="max-width: 600px">
        <el-form-item label="工号">
          <el-input v-model="userForm.employee_id" disabled />
        </el-form-item>
        <el-form-item label="姓名">
          <el-input v-model="userForm.username" />
        </el-form-item>
        <el-form-item label="部门">
          <el-input v-model="userForm.department" />
        </el-form-item>
        <el-form-item label="职称">
          <el-select v-model="userForm.title" placeholder="请选择职称" style="width: 100%">
            <el-option label="助教" value="助教" />
            <el-option label="讲师" value="讲师" />
            <el-option label="副教授" value="副教授" />
            <el-option label="教授" value="教授" />
          </el-select>
        </el-form-item>
        <el-form-item label="邮箱">
          <el-input v-model="userForm.email" />
        </el-form-item>
        <el-form-item label="手机号">
          <el-input v-model="userForm.phone" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleUpdate">保存修改</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="hover" class="mt-20">
      <template #header>
        <div class="card-header">
          <span>修改密码</span>
        </div>
      </template>
      <el-form :model="passwordForm" label-width="100px" style="max-width: 600px">
        <el-form-item label="新密码">
          <el-input v-model="passwordForm.password" type="password" show-password />
        </el-form-item>
        <el-form-item>
          <el-button type="warning" @click="handleChangePassword">确认修改</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getMe, updateUser } from '../../api/user'
import { useUserStore } from '../../stores/user'

const userStore = useUserStore()
const loading = ref(false)

const userForm = reactive({
  id: undefined as number | undefined,
  employee_id: '',
  username: '',
  department: '',
  title: '',
  email: '',
  phone: ''
})

const passwordForm = reactive({
  password: ''
})

const fetchData = async () => {
  loading.value = true
  try {
    const res: any = await getMe()
    Object.assign(userForm, res)
  } catch (error) {
    console.error('Failed to fetch profile:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchData()
})

const handleUpdate = async () => {
  if (!userForm.id) return
  try {
    await updateUser(userForm.id, {
      username: userForm.username,
      department: userForm.department,
      title: userForm.title,
      email: userForm.email,
      phone: userForm.phone
    })
    ElMessage.success('个人信息更新成功！')
    // 更新 store 中的信息
    userStore.setUserInfo({
      ...userStore.userInfo,
      username: userForm.username,
      name: userForm.username,
      department: userForm.department
    })
  } catch (error) {
    console.error('Update profile failed:', error)
  }
}

const handleChangePassword = async () => {
  if (!userForm.id || !passwordForm.password) {
    return ElMessage.warning('请输入新密码')
  }
  try {
    await updateUser(userForm.id, { password: passwordForm.password })
    ElMessage.success('密码修改成功！')
    passwordForm.password = ''
  } catch (error) {
    console.error('Change password failed:', error)
  }
}
</script>

<style scoped>
.profile-container {
  padding: 20px;
}

.mt-20 {
  margin-top: 20px;
}
</style>

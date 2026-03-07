<template>
  <div class="login-container">
    <el-card class="login-card">
      <template #header>
        <div class="login-header">
          <h2>高校教师培训管理系统</h2>
        </div>
      </template>
      <el-form :model="loginForm" :rules="rules" ref="loginFormRef">
        <el-form-item prop="employee_id">
          <el-input v-model="loginForm.employee_id" placeholder="账号/工号" prefix-icon="User" />
        </el-form-item>
        <el-form-item prop="password">
          <el-input v-model="loginForm.password" type="password" placeholder="密码" prefix-icon="Lock" show-password />
        </el-form-item>
        <el-form-item>
          <el-radio-group v-model="loginForm.role">
            <el-radio value="teacher">教师</el-radio>
            <el-radio value="trainer">讲师</el-radio>
            <el-radio value="admin">管理员</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="loading" class="login-button" @click="handleLogin">登录</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../../stores/user'
import { ElMessage } from 'element-plus'
import { login } from '../../api/auth'

const router = useRouter()
const userStore = useUserStore()

const loginFormRef = ref()
const loading = ref(false)

const loginForm = reactive({
  employee_id: '',
  password: '',
  role: 'teacher'
})

const rules = {
  employee_id: [{ required: true, message: '请输入工号', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}

const handleLogin = async () => {
  if (!loginFormRef.value) return
  
  await loginFormRef.value.validate(async (valid: boolean) => {
    if (valid) {
      loading.value = true
      try {
        const res: any = await login({
          employee_id: loginForm.employee_id,
          password: loginForm.password,
          role: loginForm.role
        })
        userStore.setToken(res.accessToken)
        userStore.setUserInfo({
          id: res.id,
          employee_id: res.employee_id,
          username: res.username,
          role: res.role,
          name: res.username // 后端没返回 name，暂时用 username
        })
        ElMessage.success('登录成功')
        router.push('/')
      } catch (error: any) {
        // 错误信息已由 request.ts 拦截器统一处理并弹出，这里无需再次弹出通用错误
        // 如果拦截器没有处理（例如抛出了非 Error 对象），则打印日志
        console.error('Login error:', error)
      } finally {
        loading.value = false
      }
    }
  })
}
</script>

<style scoped>
.login-container {
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #f5f7fa;
}

.login-card {
  width: 400px;
}

.login-header {
  text-align: center;
}

.login-button {
  width: 100%;
}
</style>

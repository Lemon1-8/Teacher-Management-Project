<template>
  <div class="exam-results-container" v-loading="loading">
    <div class="header">
      <el-page-header @back="router.back()" title="返回" content="考试成绩管理" />
    </div>

    <div class="content">
      <el-table :data="results" stripe style="width: 100%">
        <el-table-column prop="user.username" label="姓名" />
        <el-table-column prop="user.employee_id" label="工号" />
        <el-table-column prop="user.department" label="部门" />
        <el-table-column prop="score" label="分数" sortable />
        <el-table-column label="状态">
          <template #default="{ row }">
            <el-tag :type="row.is_pass ? 'success' : 'danger'">
              {{ row.is_pass ? '及格' : '不及格' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="submit_time" label="提交时间" sortable>
          <template #default="{ row }">
            {{ new Date(row.submit_time).toLocaleString() }}
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination">
        <el-pagination
          v-model:current-page="queryParams.page"
          v-model:page-size="queryParams.limit"
          :total="total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="fetchData"
          @current-change="fetchData"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getExamResults } from '../../api/exam'
import { ElMessage } from 'element-plus'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const results = ref<any[]>([])
const total = ref(0)

const queryParams = reactive({
  page: 1,
  limit: 10
})

const fetchData = async () => {
  loading.value = true
  try {
    const examId = parseInt(route.params.id as string)
    const res: any = await getExamResults(examId, queryParams)
    results.value = res.list
    total.value = res.total
  } catch (error) {
    console.error('Failed to fetch results:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.exam-results-container {
  padding: 20px;
}
.header {
  margin-bottom: 20px;
}
.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}
</style>
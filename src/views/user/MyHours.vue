<template>
  <div class="my-hours-container" v-loading="loading">
    <el-row :gutter="20">
      <el-col :span="8">
        <el-card shadow="hover" class="hours-card">
          <div class="hours-summary">
            <div class="summary-item">
              <span class="label">总学时</span>
              <span class="value">{{ totalHours }}</span>
            </div>
            <div class="summary-item">
              <span class="label">本年度学时</span>
              <span class="value">{{ annualHours }}</span>
            </div>
          </div>
          <div class="progress-section">
            <div class="label">年度达标进度 ({{ annualHours }}/40)</div>
            <el-progress :percentage="progressPercentage" :status="progressStatus" />
          </div>
        </el-card>
      </el-col>
      <el-col :span="16">
        <el-card shadow="hover">
          <template #header>
            <div class="card-header">
              <span>学时趋势 (本年度)</span>
            </div>
          </template>
          <div ref="hoursChart" style="height: 250px"></div>
        </el-card>
      </el-col>
    </el-row>

    <el-card shadow="hover" class="mt-20">
      <template #header>
        <div class="card-header">
          <span>学时明细</span>
        </div>
      </template>
      <el-table :data="hoursList" stripe style="width: 100%">
        <el-table-column prop="training.title" label="培训项目" min-width="250" />
        <el-table-column prop="type" label="获取类型" width="120">
          <template #default="{ row }">
            {{ getTypeName(row.type) }}
          </template>
        </el-table-column>
        <el-table-column prop="hours" label="获得学时" width="100" align="center" />
        <el-table-column prop="acquire_time" label="获得时间" width="180">
          <template #default="{ row }">
            {{ new Date(row.acquire_time).toLocaleString() }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" align="center">
          <template #default="{ row }">
            <el-button v-if="row.certificate_id" type="primary" link @click="downloadCert(row)">证书下载</el-button>
            <span v-else>-</span>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-if="hoursList.length === 0" description="暂无学时记录" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import * as echarts from 'echarts'
import { ElMessage } from 'element-plus'
import { getMyHours } from '../../api/statistics'

const hoursChart = ref<HTMLElement>()
const loading = ref(false)
const hoursList = ref<any[]>([])

const totalHours = computed(() => {
  return hoursList.value.reduce((sum, item) => sum + parseFloat(item.hours), 0).toFixed(1)
})

const annualHours = computed(() => {
  const currentYear = new Date().getFullYear()
  return hoursList.value
    .filter(item => new Date(item.acquire_time).getFullYear() === currentYear)
    .reduce((sum, item) => sum + parseFloat(item.hours), 0)
    .toFixed(1)
})

const progressPercentage = computed(() => Math.min((parseFloat(annualHours.value) / 40) * 100, 100))
const progressStatus = computed(() => progressPercentage.value >= 100 ? 'success' : '')

const fetchData = async () => {
  loading.value = true
  try {
    const res: any = await getMyHours()
    hoursList.value = res
    initChart()
  } catch (error) {
    console.error('Failed to fetch hours:', error)
  } finally {
    loading.value = false
  }
}

const initChart = () => {
  if (!hoursChart.value) return
  const chart = echarts.init(hoursChart.value)
  
  // 处理月度数据
  const monthlyData = new Array(12).fill(0)
  const currentYear = new Date().getFullYear()
  hoursList.value.forEach(item => {
    const date = new Date(item.acquire_time)
    if (date.getFullYear() === currentYear) {
      monthlyData[date.getMonth()] += parseFloat(item.hours)
    }
  })

  chart.setOption({
    tooltip: { trigger: 'axis' },
    xAxis: {
      type: 'category',
      data: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
    },
    yAxis: {
      type: 'value',
      name: '学时'
    },
    series: [
      {
        data: monthlyData,
        type: 'bar',
        itemStyle: { color: '#409EFF' },
        label: { show: true, position: 'top' }
      }
    ]
  })
}

onMounted(() => {
  fetchData()
})

const getTypeName = (type: string) => {
  const map: any = { training: '培训', exam: '考试', other: '其他' }
  return map[type] || type
}

const downloadCert = (row: any) => {
  ElMessage.success(`正在下载证书：${row.certificate_id}`)
}
</script>

<style scoped>
.my-hours-container {
  padding: 20px;
}

.hours-card {
  height: 310px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.hours-summary {
  display: flex;
  justify-content: space-around;
  margin-bottom: 40px;
}

.summary-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.summary-item .label {
  font-size: 14px;
  color: #909399;
  margin-bottom: 10px;
}

.summary-item .value {
  font-size: 32px;
  font-weight: bold;
  color: #409EFF;
}

.progress-section .label {
  font-size: 14px;
  color: #606266;
  margin-bottom: 10px;
}

.mt-20 {
  margin-top: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>

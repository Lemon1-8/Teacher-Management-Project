<template>
  <div class="online-exam-container" v-loading="loading">
    <div class="exam-header">
      <div class="left">
        <el-button icon="ArrowLeft" @click="handleExit">退出考试</el-button>
        <span class="exam-title">{{ exam?.title }}</span>
      </div>
      <div class="right">
        <div class="timer">
          剩余时间：<span class="time">{{ formatTime(timeLeft) }}</span>
        </div>
        <el-button type="success" @click="handleSubmit">提交试卷</el-button>
      </div>
    </div>

    <div class="exam-main">
      <div class="question-container" v-if="currentQuestion">
        <div class="question-title">
          <span class="index">{{ currentIndex + 1 }}.</span>
          <span class="type">[{{ getQuestionTypeLabel(currentQuestion.type) }}]</span>
          <span class="content">{{ currentQuestion.content }}</span>
          <span class="score">({{ currentQuestion.score }}分)</span>
        </div>

        <div class="options">
          <el-radio-group v-if="currentQuestion.type === 'single' || currentQuestion.type === 'truefalse'" v-model="answers[currentQuestion.id]">
            <el-radio v-for="(val, key) in currentQuestion.options" :key="key" :label="key" border class="option-item">
              {{ key }}. {{ val }}
            </el-radio>
          </el-radio-group>
          <el-checkbox-group v-else-if="currentQuestion.type === 'multiple'" v-model="answers[currentQuestion.id]">
            <el-checkbox v-for="(val, key) in currentQuestion.options" :key="key" :label="key" border class="option-item">
              {{ key }}. {{ val }}
            </el-checkbox>
          </el-checkbox-group>
        </div>

        <div class="navigation">
          <el-button :disabled="currentIndex === 0" @click="currentIndex--">上一题</el-button>
          <el-button v-if="currentIndex < questions.length - 1" type="primary" @click="currentIndex++">下一题</el-button>
          <el-button v-else type="success" @click="handleSubmit">完成并提交</el-button>
        </div>
      </div>

      <div class="answer-sheet">
        <div class="sheet-title">答题卡</div>
        <div class="status">
          <span class="item"><span class="dot answered"></span> 已答</span>
          <span class="item"><span class="dot unanswered"></span> 未答</span>
        </div>
        <div class="question-numbers">
          <div 
            v-for="(q, index) in questions" 
            :key="q.id" 
            class="number-item" 
            :class="{ active: currentIndex === index, answered: isAnswered(q.id) }"
            @click="currentIndex = index"
          >
            {{ index + 1 }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { startExam, submitExam, getExamDetail } from '../../api/exam'

const router = useRouter()
const route = useRoute()
const loading = ref(false)
const examId = parseInt(route.params.id as string)

const exam = ref<any>(null)
const questions = ref<any[]>([])
const resultId = ref<number | null>(null)
const currentIndex = ref(0)
const answers = reactive<Record<number, any>>({})
const timeLeft = ref(0)
let timer: any = null

const currentQuestion = computed(() => questions.value[currentIndex.value])

const fetchData = async () => {
  loading.value = true
  try {
    const examRes: any = await getExamDetail(examId)
    exam.value = examRes

    const res: any = await startExam(examId)
    resultId.value = res.resultId
    questions.value = res.questions
    timeLeft.value = res.duration * 60

    // 初始化答案
    questions.value.forEach(q => {
      if (q.type === 'multiple') {
        answers[q.id] = []
      } else {
        answers[q.id] = null
      }
    })

    startTimer()
  } catch (error) {
    console.error('Failed to start exam:', error)
    router.back()
  } finally {
    loading.value = false
  }
}

const startTimer = () => {
  timer = setInterval(() => {
    if (timeLeft.value > 0) {
      timeLeft.value--
    } else {
      clearInterval(timer)
      autoSubmit()
    }
  }, 1000)
}

const formatTime = (seconds: number) => {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

const getQuestionTypeLabel = (type: string) => {
  const map: any = { single: '单选题', multiple: '多选题', truefalse: '判断题' }
  return map[type] || type
}

const isAnswered = (id: number) => {
  const ans = answers[id]
  if (Array.isArray(ans)) return ans.length > 0
  return ans !== null && ans !== undefined
}

const handleExit = () => {
  ElMessageBox.confirm('考试正在进行中，退出将不会保存当前进度，确定退出吗？', '提示', {
    confirmButtonText: '确定退出',
    cancelButtonText: '继续考试',
    type: 'warning'
  }).then(() => {
    router.back()
  })
}

const handleSubmit = () => {
  const unansweredCount = questions.value.filter(q => !isAnswered(q.id)).length
  let message = '确定提交试卷吗？'
  if (unansweredCount > 0) {
    message = `您还有 ${unansweredCount} 道题未作答，确定提交吗？`
  }

  ElMessageBox.confirm(message, '提示', {
    confirmButtonText: '确定提交',
    cancelButtonText: '检查一下',
    type: 'success'
  }).then(async () => {
    doSubmit()
  })
}

const autoSubmit = () => {
  ElMessage.warning('考试时间到，系统已自动交卷')
  doSubmit()
}

const doSubmit = async () => {
  if (!resultId.value) return
  loading.value = true
  try {
    const res: any = await submitExam(resultId.value, { answers })
    ElMessageBox.alert(`考试结束！您的得分是：${res.score}分 (${res.isPass ? '及格' : '不及格'})`, '考试结果', {
      confirmButtonText: '返回列表',
      callback: () => {
        router.push('/exam/list')
      }
    })
  } catch (error) {
    console.error('Submit failed:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchData()
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<style scoped>
.online-exam-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #f5f7fa;
}

.exam-header {
  height: 60px;
  background-color: #fff;
  padding: 0 40px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 12px 0 rgba(0,0,0,0.1);
  z-index: 10;
}

.left {
  display: flex;
  align-items: center;
  gap: 20px;
}

.exam-title {
  font-size: 18px;
  font-weight: bold;
}

.right {
  display: flex;
  align-items: center;
  gap: 30px;
}

.timer {
  font-size: 16px;
}

.time {
  color: #f56c6c;
  font-weight: bold;
  font-family: monospace;
  font-size: 20px;
}

.exam-main {
  flex: 1;
  padding: 30px 40px;
  display: flex;
  gap: 30px;
  overflow: hidden;
}

.question-container {
  flex: 1;
  background-color: #fff;
  padding: 40px;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.question-title {
  font-size: 18px;
  line-height: 1.6;
  margin-bottom: 30px;
}

.index {
  font-weight: bold;
  margin-right: 10px;
}

.type {
  color: #409EFF;
  margin-right: 10px;
}

.score {
  color: #909399;
  font-size: 14px;
  margin-left: 10px;
}

.options {
  display: flex;
  flex-direction: column;
  gap: 15px;
  margin-bottom: 40px;
}

.option-item {
  width: 100%;
  margin-left: 0 !important;
  margin-bottom: 10px;
  text-align: left;
  padding: 15px 20px;
  height: auto;
}

.navigation {
  margin-top: auto;
  display: flex;
  justify-content: center;
  gap: 20px;
}

.answer-sheet {
  width: 300px;
  background-color: #fff;
  padding: 20px;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
}

.sheet-title {
  font-weight: bold;
  font-size: 16px;
  margin-bottom: 20px;
  text-align: center;
}

.status {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-bottom: 20px;
  font-size: 12px;
}

.dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 5px;
}

.answered { background-color: #67C23A; }
.unanswered { background-color: #DCDFE6; }

.question-numbers {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 10px;
}

.number-item {
  height: 36px;
  border: 1px solid #DCDFE6;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-radius: 4px;
  font-size: 14px;
  transition: all 0.3s;
}

.number-item:hover {
  border-color: #409EFF;
  color: #409EFF;
}

.number-item.active {
  border-color: #409EFF;
  background-color: #409EFF;
  color: #fff;
}

.number-item.answered {
  background-color: #f0f9eb;
  border-color: #c2e7b0;
  color: #67C23A;
}

.number-item.answered.active {
  background-color: #67C23A;
  border-color: #67C23A;
  color: #fff;
}
</style>

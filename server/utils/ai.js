const OpenAI = require("openai");
const logger = require("./logger");

const openai = new OpenAI({
  apiKey: process.env.AI_API_KEY || "sk-your-deepseek-api-key",
  baseURL: process.env.AI_BASE_URL || "https://api.deepseek.com",
});

const MODEL = process.env.AI_MODEL || "deepseek-chat";

/**
 * 根据培训内容生成考试题目
 * @param {string} content 培训文本内容
 * @param {Object} options 生成选项
 * @returns {Array} 题目列表
 */
async function generateQuestions(content, options = {}) {
  const {
    singleCount = 5,
    multipleCount = 3,
    truefalseCount = 2,
    score = 5,
  } = options;

  const prompt = `你是一位高校教师培训的出题专家。请根据以下培训内容，生成${singleCount}道单选题、${multipleCount}道多选题、${truefalseCount}道判断题。

要求：
1. 题目覆盖培训内容的核心知识点，不要出过于偏门的题目
2. 单选题和多选题的选项应有干扰性，不能显而易见
3. 判断题格式：A="正确" B="错误"，答案只能是A或B
4. 每道题都要有简明扼要的答案解析
5. 多选题答案用数组表示，如 ["A", "C"]

严格按照以下 JSON 格式输出，不要输出任何其他文字：

[
  {
    "type": "single",
    "content": "题目内容",
    "options": {"A": "选项A", "B": "选项B", "C": "选项C", "D": "选项D"},
    "answer": "A",
    "score": ${score},
    "analysis": "解析..."
  }
]

培训内容如下：
---
${content}
---`;

  const completion = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
        content: "你是一个严格的 JSON 输出器。只输出合法的 JSON 数组，不输出其他任何内容。",
      },
      { role: "user", content: prompt },
    ],
    max_tokens: 8192,
    temperature: 0.7,
  });

  const text = completion.choices[0]?.message?.content || "";

  // 提取 JSON 数组（处理可能被 markdown 代码块包裹的情况）
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    logger.error("AI 返回内容无法解析为 JSON: " + text);
    throw new Error("AI 返回内容格式异常，请重试");
  }

  const questions = JSON.parse(jsonMatch[0]);

  // 校验并修正每道题的格式
  return questions.map((q, index) => ({
    type: ["single", "multiple", "truefalse"].includes(q.type) ? q.type : "single",
    content: q.content || "（未生成）",
    options: q.options || (q.type === "truefalse" ? { A: "正确", B: "错误" } : {}),
    answer: q.answer || "",
    score: q.score || score,
    analysis: q.analysis || "",
    sort: index,
  }));
}

module.exports = { generateQuestions };

import { tool } from '@openai/agents/realtime';
import { questionBank } from './sampleData';

export const generateQuestion = tool({
  name: 'generateQuestion',
  description: '根据知识点生成适合的练习题',
  parameters: {
    type: 'object',
    properties: {
      topic: {
        type: 'string',
        description: '要练习的数学知识点',
      },
      difficulty: {
        type: 'string',
        enum: ['easy', 'medium', 'hard'],
        description: '题目难度等级',
      },
      questionType: {
        type: 'string',
        enum: ['choice', 'fill', 'solve', 'proof'],
        description: '题目类型：选择题、填空题、解答题、证明题',
      },
      count: {
        type: 'number',
        description: '生成题目数量',
        minimum: 1,
        maximum: 5,
      }
    },
    required: ['topic'],
    additionalProperties: false,
  },
  execute: async (input) => {
    const { topic, difficulty = 'easy', questionType = 'choice', count = 1 } = input;
    
    // 在题库中查找相关题目
    const relatedQuestions = questionBank.filter(q => 
      q.topic.toLowerCase().includes(topic.toLowerCase()) &&
      q.difficulty === difficulty &&
      q.type === questionType
    );

    if (relatedQuestions.length === 0) {
      // 如果没有找到，生成基础题目
      const generatedQuestion = generateBasicQuestion(topic, difficulty, questionType);
      return {
        success: true,
        questions: [generatedQuestion],
        message: `我为你生成了一道关于"${topic}"的${getDifficultyText(difficulty)}${getTypeText(questionType)}。`
      };
    }

    // 随机选择题目
    const selectedQuestions = [];
    const shuffled = [...relatedQuestions].sort(() => 0.5 - Math.random());
    
    for (let i = 0; i < Math.min(count, shuffled.length); i++) {
      selectedQuestions.push(shuffled[i]);
    }

    return {
      success: true,
      questions: selectedQuestions,
      message: `我为你准备了${selectedQuestions.length}道关于"${topic}"的练习题。请仔细思考后回答。`
    };
  },
});

export const checkAnswer = tool({
  name: 'checkAnswer',
  description: '检查学生答案并提供详细反馈',
  parameters: {
    type: 'object',
    properties: {
      questionId: {
        type: 'string',
        description: '题目ID',
      },
      studentAnswer: {
        type: 'string',
        description: '学生的答案',
      },
      showSteps: {
        type: 'boolean',
        description: '是否显示详细解题步骤',
      }
    },
    required: ['questionId', 'studentAnswer'],
    additionalProperties: false,
  },
  execute: async (input) => {
    const { questionId, studentAnswer, showSteps = true } = input;
    
    // 查找题目
    const question = questionBank.find(q => q.id === questionId);
    
    if (!question) {
      return {
        success: false,
        message: '抱歉，我找不到这道题目的信息。'
      };
    }

    // 检查答案
    const isCorrect = checkAnswerCorrectness(question, studentAnswer);
    const feedback = generateFeedback(question, studentAnswer, isCorrect);
    
    return {
      success: true,
      correct: isCorrect,
      feedback: feedback,
      explanation: showSteps ? question.solution : null,
      encouragement: generateEncouragement(isCorrect),
      nextSuggestion: generateNextSuggestion(question, isCorrect)
    };
  },
});

export const getHandoffToTeach = tool({
  name: 'getHandoffToTeach', 
  description: '当学生需要重新学习概念时，从练习代理转回教学代理',
  parameters: {
    type: 'object',
    properties: {
      strugglingTopic: {
        type: 'string',
        description: '学生遇到困难的知识点',
      },
      errorAnalysis: {
        type: 'string',
        description: '错误分析和需要加强的方面',
      },
      notes: {
        type: 'string',
        description: '给教学代理的备注信息',
      }
    },
    required: ['strugglingTopic'],
    additionalProperties: false,
  },
  execute: async (input) => {
    const { strugglingTopic, errorAnalysis, notes } = input;
    
    return {
      handoff: true,
      targetAgent: 'teachAgent',
      context: {
        reviewTopic: strugglingTopic,
        weakPoints: errorAnalysis,
        practiceNotes: notes || '学生在练习中遇到困难，需要重新讲解概念',
        timestamp: new Date().toISOString()
      },
      message: `没关系，让我们回到基础概念上。我来重新为你讲解${strugglingTopic}，这次我们会更加细致。`
    };
  },
});

function generateBasicQuestion(topic, difficulty, questionType) {
  const questionId = `gen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const templates = {
    trigonometry: {
      easy: {
        choice: {
          question: 'sin(30°) 的值是？',
          options: ['A. 1/2', 'B. √3/2', 'C. 1', 'D. √2/2'],
          correctAnswer: 'A',
          solution: 'sin(30°) = 1/2，这是一个基础的特殊角三角函数值。'
        },
        fill: {
          question: 'cos(60°) = ___',
          correctAnswer: '1/2',
          solution: 'cos(60°) = 1/2，可以通过直角三角形或单位圆来记忆。'
        }
      },
      medium: {
        solve: {
          question: '求解方程：sin(x) = 1/2，其中 0° ≤ x ≤ 360°',
          correctAnswer: 'x = 30° 或 x = 150°',
          solution: 'sin(x) = 1/2 在 [0°, 360°] 区间内的解为 x = 30° 和 x = 150°。'
        }
      }
    },
    algebra: {
      easy: {
        choice: {
          question: '化简 2x + 3x 的结果是？',
          options: ['A. 5x', 'B. 6x', 'C. 5x²', 'D. 2x + 3x'],
          correctAnswer: 'A',
          solution: '同类项相加：2x + 3x = (2+3)x = 5x'
        }
      }
    }
  };

  // 根据主题查找模板
  const topicKey = Object.keys(templates).find(key => 
    topic.toLowerCase().includes(key) || key.includes(topic.toLowerCase())
  );
  
  if (topicKey && templates[topicKey][difficulty] && templates[topicKey][difficulty][questionType]) {
    return {
      id: questionId,
      topic: topic,
      difficulty: difficulty,
      type: questionType,
      ...templates[topicKey][difficulty][questionType]
    };
  }

  // 默认题目
  return {
    id: questionId,
    topic: topic,
    difficulty: difficulty,
    type: questionType,
    question: `请解决这个关于 ${topic} 的问题。`,
    correctAnswer: '请提供具体的答案',
    solution: '这是一个基础练习题，请根据学过的知识来解答。'
  };
}

function checkAnswerCorrectness(question, studentAnswer) {
  const correctAnswer = question.correctAnswer.toLowerCase().trim();
  const studentAns = studentAnswer.toLowerCase().trim();
  
  // 精确匹配
  if (studentAns === correctAnswer) {
    return true;
  }
  
  // 选择题匹配（只看选项字母）
  if (question.type === 'choice') {
    const correctOption = correctAnswer.charAt(0);
    const studentOption = studentAns.charAt(0);
    return correctOption === studentOption;
  }
  
  // 数值答案的近似匹配
  const numericCorrect = parseFloat(correctAnswer);
  const numericStudent = parseFloat(studentAns);
  
  if (!isNaN(numericCorrect) && !isNaN(numericStudent)) {
    return Math.abs(numericCorrect - numericStudent) < 0.01;
  }
  
  // 包含关键词的部分匹配
  const keywords = correctAnswer.split(/[\s,，、]+/);
  const matchCount = keywords.filter(keyword => 
    studentAns.includes(keyword)
  ).length;
  
  return matchCount / keywords.length >= 0.7; // 70%的关键词匹配
}

function generateFeedback(question, studentAnswer, isCorrect) {
  if (isCorrect) {
    return {
      type: 'positive',
      message: '回答正确！你很好地掌握了这个知识点。',
      details: `你的答案"${studentAnswer}"是正确的。`
    };
  } else {
    return {
      type: 'constructive',
      message: '答案不太对，但是没关系，让我来帮你分析一下。',
      details: `你的答案是"${studentAnswer}"，正确答案是"${question.correctAnswer}"。`,
      hints: generateHints(question, studentAnswer)
    };
  }
}

function generateHints(question, studentAnswer) {
  const hints = [];
  
  if (question.type === 'choice') {
    hints.push('这是一道选择题，请仔细比较各个选项的区别。');
  }
  
  if (question.topic.includes('三角函数')) {
    hints.push('回忆一下特殊角的三角函数值，或者画一个单位圆来帮助思考。');
  }
  
  if (question.topic.includes('代数')) {
    hints.push('注意同类项的合并规则，系数相加，字母部分不变。');
  }
  
  hints.push('如果还有疑问，我可以重新为你讲解这个知识点。');
  
  return hints;
}

function generateEncouragement(isCorrect) {
  const positiveMessages = [
    '太棒了！继续保持这样的学习状态！',
    '很好！你的理解很到位！',
    '正确！看来你已经掌握了这个概念！'
  ];
  
  const encouragingMessages = [
    '不要灰心，数学需要多练习！',
    '做错了也是学习的一部分，让我们一起分析一下！',
    '每个人都会犯错，重要的是从错误中学习！'
  ];
  
  if (isCorrect) {
    return positiveMessages[Math.floor(Math.random() * positiveMessages.length)];
  } else {
    return encouragingMessages[Math.floor(Math.random() * encouragingMessages.length)];
  }
}

function generateNextSuggestion(question, isCorrect) {
  if (isCorrect) {
    return {
      type: 'advance',
      message: '你可以尝试更有挑战性的题目，或者学习相关的新知识点。',
      options: ['继续同类型题目', '提高难度', '学习新知识点']
    };
  } else {
    return {
      type: 'review',
      message: '建议先复习一下基础概念，然后再做类似的练习。',
      options: ['重新学习概念', '做简单一点的题目', '查看详细解析']
    };
  }
}

function getDifficultyText(difficulty) {
  const map = {
    'easy': '简单',
    'medium': '中等',
    'hard': '困难'
  };
  return map[difficulty] || '基础';
}

function getTypeText(type) {
  const map = {
    'choice': '选择题',
    'fill': '填空题',
    'solve': '解答题',
    'proof': '证明题'
  };
  return map[type] || '练习题';
}
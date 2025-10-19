import { tool } from '@openai/agents/realtime';
import { mathKnowledgeBase, visualizationTemplates } from './sampleData';

export const searchKnowledge = tool({
  name: 'searchKnowledge',
  description: '搜索数学知识点的详细信息、相关例题和教学资源',
  parameters: {
    type: 'object',
    properties: {
      topic: {
        type: 'string',
        description: '要搜索的数学知识点或主题',
      },
      level: {
        type: 'string',
        enum: ['elementary', 'middle', 'high', 'college'],
        description: '适合的教学水平',
      }
    },
    required: ['topic'],
    additionalProperties: false,
  },
  execute: async (input) => {
    const { topic, level = 'middle' } = input;
    
    // 在知识库中搜索相关内容
    const results = mathKnowledgeBase.filter(item => 
      item.topic.toLowerCase().includes(topic.toLowerCase()) ||
      item.keywords.some(keyword => 
        keyword.toLowerCase().includes(topic.toLowerCase())
      )
    ).filter(item => 
      level ? item.level === level : true
    );

    if (results.length === 0) {
      return {
        found: false,
        message: `抱歉，没有找到关于"${topic}"的相关资料。让我为你提供一些基础的解释...`,
        suggestions: ['请具体化你的问题', '或者从更基础的概念开始']
      };
    }

    return {
      found: true,
      results: results.map(item => ({
        title: item.title,
        concept: item.concept,
        explanation: item.explanation,
        examples: item.examples,
        prerequisites: item.prerequisites,
        applications: item.applications
      })),
      message: `找到了${results.length}个相关的知识点，我来为你详细讲解。`
    };
  },
});

export const createVisualization = tool({
  name: 'createVisualization',
  description: '创建HTML/CSS/JS动画来可视化数学概念',
  parameters: {
    type: 'object',
    properties: {
      concept: {
        type: 'string',
        description: '要可视化的数学概念',
      },
      type: {
        type: 'string',
        enum: ['animation', 'interactive', 'chart', 'diagram'],
        description: '可视化类型',
      },
      description: {
        type: 'string',
        description: '可视化的详细描述和要求',
      }
    },
    required: ['concept', 'type', 'description'],
    additionalProperties: false,
  },
  execute: async (input) => {
    const { concept, type, description } = input;
    
    // 查找预定义的可视化模板
    const template = visualizationTemplates.find(t => 
      t.concept.toLowerCase().includes(concept.toLowerCase()) &&
      t.type === type
    );

    if (template) {
      return {
        success: true,
        visualization: {
          html: template.html,
          css: template.css,
          js: template.js,
          title: template.title,
          instructions: template.instructions
        },
        message: `我为"${concept}"创建了一个${type === 'animation' ? '动画演示' : type === 'interactive' ? '交互式图表' : '图表'}。`
      };
    }

    // 如果没有预定义模板，生成基础的可视化代码
    const basicVisualization = generateBasicVisualization(concept, type, description);
    
    return {
      success: true,
      visualization: basicVisualization,
      message: `我为"${concept}"创建了一个自定义的${type === 'animation' ? '动画演示' : '可视化图表'}。你可以通过这个演示来更好地理解这个概念。`
    };
  },
});

function generateBasicVisualization(concept, type, description) {
  const baseHTML = `
    <div id="math-visualization" class="visualization-container">
      <h3>${concept} - 可视化演示</h3>
      <div id="canvas-container">
        <canvas id="math-canvas" width="400" height="300"></canvas>
      </div>
      <div class="controls">
        <button onclick="startAnimation()">开始</button>
        <button onclick="pauseAnimation()">暂停</button>
        <button onclick="resetAnimation()">重置</button>
      </div>
      <div class="description">
        <p>${description}</p>
      </div>
    </div>
  `;

  const baseCSS = `
    .visualization-container {
      font-family: Arial, sans-serif;
      text-align: center;
      padding: 20px;
      border: 2px solid #3498db;
      border-radius: 10px;
      background-color: #f8f9fa;
    }
    
    #canvas-container {
      margin: 20px 0;
      display: flex;
      justify-content: center;
    }
    
    #math-canvas {
      border: 1px solid #ddd;
      background-color: white;
    }
    
    .controls button {
      margin: 0 10px;
      padding: 10px 20px;
      background-color: #3498db;
      color: white;
      border: none;
      border-radius: 5px;
      cursor: pointer;
    }
    
    .controls button:hover {
      background-color: #2980b9;
    }
    
    .description {
      margin-top: 20px;
      text-align: left;
      background-color: #e8f4f8;
      padding: 15px;
      border-radius: 5px;
    }
  `;

  const baseJS = `
    const canvas = document.getElementById('math-canvas');
    const ctx = canvas.getContext('2d');
    let animationId;
    let isAnimating = false;
    
    function startAnimation() {
      if (!isAnimating) {
        isAnimating = true;
        animate();
      }
    }
    
    function pauseAnimation() {
      isAnimating = false;
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    }
    
    function resetAnimation() {
      pauseAnimation();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawInitialState();
    }
    
    function animate() {
      if (isAnimating) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // 这里添加具体的动画逻辑
        drawFrame();
        animationId = requestAnimationFrame(animate);
      }
    }
    
    function drawInitialState() {
      ctx.strokeStyle = '#3498db';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(200, 150, 50, 0, 2 * Math.PI);
      ctx.stroke();
    }
    
    function drawFrame() {
      // 基础绘制逻辑
      drawInitialState();
    }
    
    // 初始化
    drawInitialState();
  `;

  return {
    html: baseHTML,
    css: baseCSS,
    js: baseJS,
    title: `${concept}可视化演示`,
    instructions: '点击"开始"按钮来查看动画演示。你可以随时暂停和重置动画。'
  };
}

export const getHandoffToPractise = tool({
  name: 'getHandoffToPractise',
  description: '当学生理解了概念后，将对话转交给练习代理进行练习巩固',
  parameters: {
    type: 'object',
    properties: {
      knowledgePoint: {
        type: 'string',
        description: '学生刚学习的知识点',
      },
      studentLevel: {
        type: 'string',
        description: '学生的理解程度评估',
      },
      notes: {
        type: 'string',
        description: '给练习代理的备注信息',
      }
    },
    required: ['knowledgePoint'],
    additionalProperties: false,
  },
  execute: async (input) => {
    const { knowledgePoint, studentLevel = '基础理解', notes } = input;
    
    return {
      handoff: true,
      targetAgent: 'practiseAgent',
      context: {
        learnedTopic: knowledgePoint,
        studentLevel: studentLevel,
        teacherNotes: notes || '学生已基本理解概念，可以开始练习',
        timestamp: new Date().toISOString()
      },
      message: `很好！看起来你已经理解了${knowledgePoint}的基本概念。现在让我们的练习助手小练来帮你巩固这些知识吧！`
    };
  },
});
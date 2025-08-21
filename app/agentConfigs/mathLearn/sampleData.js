// 数学知识库
export const mathKnowledgeBase = [
  {
    id: 'trig-001',
    topic: '三角函数',
    title: '三角函数基础',
    level: 'high',
    keywords: ['sin', 'cos', 'tan', '正弦', '余弦', '正切', '特殊角'],
    concept: '三角函数是描述角度与边长关系的函数',
    explanation: `
      三角函数是数学中最重要的函数之一。想象你站在一个圆的中心，向外伸出一根指针：
      
      - sin(角度) = 指针末端的高度 ÷ 圆的半径
      - cos(角度) = 指针末端的水平距离 ÷ 圆的半径  
      - tan(角度) = sin(角度) ÷ cos(角度)
      
      特殊角度的值需要牢记：
      - sin(30°) = 1/2, cos(30°) = √3/2
      - sin(45°) = √2/2, cos(45°) = √2/2
      - sin(60°) = √3/2, cos(60°) = 1/2
    `,
    prerequisites: ['角度概念', '直角三角形', '勾股定理'],
    examples: [
      '在直角三角形中，如果一个角是30°，对边是5，求斜边长度',
      '计算sin(45°) + cos(45°)的值'
    ],
    applications: ['物理中的波动', '工程测量', '音乐中的和谐']
  },
  {
    id: 'alg-001',
    topic: '代数',
    title: '代数基础运算',
    level: 'middle',
    keywords: ['同类项', '合并', '加法', '减法', '变量'],
    concept: '代数是用字母代表数字进行运算的方法',
    explanation: `
      代数让我们可以用字母来代表未知的数字：
      
      - 同类项：含有相同字母且字母的指数也相同的项
      - 合并同类项：把同类项的系数相加，字母部分不变
      
      例如：2x + 3x = (2+3)x = 5x
      
      记住：只有同类项才能合并！
      - 2x + 3x = 5x (可以合并)
      - 2x + 3y = 2x + 3y (不能合并)
    `,
    prerequisites: ['数的运算', '负数概念'],
    examples: [
      '合并同类项：3a + 2a - a',
      '化简：2x + 3y - x + y'
    ],
    applications: ['解方程', '几何计算', '物理公式']
  },
  {
    id: 'geom-001',
    topic: '几何',
    title: '平面几何基础',
    level: 'middle',
    keywords: ['三角形', '面积', '周长', '相似', '全等'],
    concept: '几何研究空间中图形的性质和关系',
    explanation: `
      平面几何主要研究二维图形：
      
      三角形是最基本的多边形：
      - 面积 = 底 × 高 ÷ 2
      - 三边之和等于周长
      - 内角和等于180°
      
      重要定理：
      - 勾股定理：a² + b² = c²（直角三角形）
      - 相似三角形对应边成比例
    `,
    prerequisites: ['长度测量', '角度概念'],
    examples: [
      '求直角三角形的第三边长',
      '计算三角形的面积'
    ],
    applications: ['建筑设计', '地图测绘', '艺术构图']
  }
];

// 题目库
export const questionBank = [
  // 三角函数题目
  {
    id: 'trig-q001',
    topic: '三角函数',
    difficulty: 'easy',
    type: 'choice',
    question: 'sin(30°) 的值是？',
    options: ['A. 1/2', 'B. √3/2', 'C. 1', 'D. √2/2'],
    correctAnswer: 'A',
    solution: 'sin(30°) = 1/2，这是需要记忆的特殊角三角函数值。可以通过30-60-90直角三角形来理解。'
  },
  {
    id: 'trig-q002',
    topic: '三角函数',
    difficulty: 'easy',
    type: 'fill',
    question: 'cos(60°) = ___',
    correctAnswer: '1/2',
    solution: 'cos(60°) = 1/2。在30-60-90直角三角形中，60°角的邻边是斜边的一半。'
  },
  {
    id: 'trig-q003',
    topic: '三角函数',
    difficulty: 'medium',
    type: 'solve',
    question: '在直角三角形ABC中，∠C=90°，∠A=30°，BC=6，求AB的长度。',
    correctAnswer: '12',
    solution: '因为sin(30°) = BC/AB = 1/2，所以AB = BC/(1/2) = 6×2 = 12。'
  },
  
  // 代数题目
  {
    id: 'alg-q001',
    topic: '代数',
    difficulty: 'easy',
    type: 'choice',
    question: '化简 2x + 3x 的结果是？',
    options: ['A. 5x', 'B. 6x', 'C. 5x²', 'D. 2x + 3x'],
    correctAnswer: 'A',
    solution: '2x和3x是同类项，合并同类项：2x + 3x = (2+3)x = 5x。'
  },
  {
    id: 'alg-q002',
    topic: '代数',
    difficulty: 'easy',
    type: 'fill',
    question: '合并同类项：3a + 2a - a = ___',
    correctAnswer: '4a',
    solution: '同类项合并：3a + 2a - a = (3+2-1)a = 4a。'
  },
  {
    id: 'alg-q003',
    topic: '代数',
    difficulty: 'medium',
    type: 'solve',
    question: '化简：2x + 3y - x + 2y - y',
    correctAnswer: 'x + 4y',
    solution: '分别合并同类项：x的项：2x - x = x；y的项：3y + 2y - y = 4y。结果：x + 4y。'
  },
  
  // 几何题目
  {
    id: 'geom-q001',
    topic: '几何',
    difficulty: 'easy',
    type: 'choice',
    question: '直角三角形的内角和是？',
    options: ['A. 90°', 'B. 180°', 'C. 270°', 'D. 360°'],
    correctAnswer: 'B',
    solution: '所有三角形的内角和都是180°，直角三角形也不例外。'
  },
  {
    id: 'geom-q002',
    topic: '几何',
    difficulty: 'medium',
    type: 'solve',
    question: '在直角三角形中，两直角边分别是3和4，求斜边长度。',
    correctAnswer: '5',
    solution: '根据勾股定理：c² = a² + b² = 3² + 4² = 9 + 16 = 25，所以c = 5。'
  }
];

// 可视化模板
export const visualizationTemplates = [
  {
    id: 'trig-unit-circle',
    concept: '三角函数',
    type: 'animation',
    title: '单位圆三角函数演示',
    html: `
      <div class="unit-circle-demo">
        <h3>单位圆三角函数演示</h3>
        <div class="canvas-container">
          <canvas id="unitCircle" width="400" height="400"></canvas>
        </div>
        <div class="controls">
          <label>角度: <span id="angleDisplay">0°</span></label>
          <input type="range" id="angleSlider" min="0" max="360" value="0">
          <div class="values">
            <div>sin = <span id="sinValue">0.00</span></div>
            <div>cos = <span id="cosValue">1.00</span></div>
            <div>tan = <span id="tanValue">0.00</span></div>
          </div>
        </div>
      </div>
    `,
    css: `
      .unit-circle-demo {
        font-family: Arial, sans-serif;
        text-align: center;
        padding: 20px;
        background-color: #f8f9fa;
        border-radius: 10px;
      }
      
      .canvas-container {
        margin: 20px 0;
        display: flex;
        justify-content: center;
      }
      
      #unitCircle {
        border: 2px solid #333;
        background-color: white;
      }
      
      .controls {
        margin-top: 20px;
      }
      
      .controls label {
        display: block;
        margin-bottom: 10px;
        font-weight: bold;
      }
      
      #angleSlider {
        width: 300px;
        margin: 10px 0;
      }
      
      .values {
        display: flex;
        justify-content: center;
        gap: 20px;
        margin-top: 15px;
        font-family: monospace;
        font-size: 16px;
      }
      
      .values > div {
        background-color: #e9ecef;
        padding: 5px 10px;
        border-radius: 5px;
      }
    `,
    js: `
      const canvas = document.getElementById('unitCircle');
      const ctx = canvas.getContext('2d');
      const angleSlider = document.getElementById('angleSlider');
      const angleDisplay = document.getElementById('angleDisplay');
      const sinValue = document.getElementById('sinValue');
      const cosValue = document.getElementById('cosValue');
      const tanValue = document.getElementById('tanValue');
      
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const radius = 150;
      
      function drawUnitCircle(angleDeg) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const angleRad = (angleDeg * Math.PI) / 180;
        const x = Math.cos(angleRad) * radius;
        const y = -Math.sin(angleRad) * radius; // 负号因为canvas y轴向下
        
        // 绘制坐标轴
        ctx.strokeStyle = '#ccc';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, centerY);
        ctx.lineTo(canvas.width, centerY);
        ctx.moveTo(centerX, 0);
        ctx.lineTo(centerX, canvas.height);
        ctx.stroke();
        
        // 绘制单位圆
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        ctx.stroke();
        
        // 绘制角度线
        ctx.strokeStyle = '#e74c3c';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(centerX + x, centerY + y);
        ctx.stroke();
        
        // 绘制点
        ctx.fillStyle = '#e74c3c';
        ctx.beginPath();
        ctx.arc(centerX + x, centerY + y, 6, 0, 2 * Math.PI);
        ctx.fill();
        
        // 绘制sin线（垂直）
        ctx.strokeStyle = '#27ae60';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(centerX + x, centerY);
        ctx.lineTo(centerX + x, centerY + y);
        ctx.stroke();
        
        // 绘制cos线（水平）
        ctx.strokeStyle = '#3498db';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(centerX + x, centerY);
        ctx.stroke();
        
        // 标注
        ctx.fillStyle = '#27ae60';
        ctx.font = '14px Arial';
        ctx.fillText('sin', centerX + x + 10, centerY + y/2);
        
        ctx.fillStyle = '#3498db';
        ctx.fillText('cos', centerX + x/2, centerY - 10);
        
        // 更新数值
        const sinVal = Math.sin(angleRad);
        const cosVal = Math.cos(angleRad);
        const tanVal = Math.tan(angleRad);
        
        angleDisplay.textContent = angleDeg + '°';
        sinValue.textContent = sinVal.toFixed(3);
        cosValue.textContent = cosVal.toFixed(3);
        tanValue.textContent = isFinite(tanVal) ? tanVal.toFixed(3) : '∞';
      }
      
      angleSlider.addEventListener('input', (e) => {
        drawUnitCircle(parseInt(e.target.value));
      });
      
      // 初始绘制
      drawUnitCircle(0);
    `,
    instructions: '拖动滑块改变角度，观察sin、cos、tan值的变化。绿色线段表示sin值，蓝色线段表示cos值。'
  },
  {
    id: 'alg-combine-terms',
    concept: '代数',
    type: 'interactive',
    title: '同类项合并演示',
    html: `
      <div class="algebra-demo">
        <h3>同类项合并演示</h3>
        <div class="expression">
          <span class="term term-x">2x</span>
          <span class="operator">+</span>
          <span class="term term-y">3y</span>
          <span class="operator">+</span>
          <span class="term term-x">5x</span>
          <span class="operator">-</span>
          <span class="term term-y">y</span>
        </div>
        <button onclick="groupTerms()">分组同类项</button>
        <button onclick="combineTerms()">合并同类项</button>
        <button onclick="showResult()">显示结果</button>
        <button onclick="reset()">重置</button>
        <div id="result" class="result"></div>
      </div>
    `,
    css: `
      .algebra-demo {
        font-family: Arial, sans-serif;
        text-align: center;
        padding: 30px;
        background-color: #f8f9fa;
        border-radius: 10px;
      }
      
      .expression {
        font-size: 24px;
        margin: 30px 0;
        min-height: 40px;
      }
      
      .term {
        display: inline-block;
        padding: 8px 12px;
        margin: 0 5px;
        border-radius: 8px;
        font-weight: bold;
        transition: all 0.3s ease;
      }
      
      .term-x {
        background-color: #e3f2fd;
        color: #1565c0;
      }
      
      .term-y {
        background-color: #f3e5f5;
        color: #7b1fa2;
      }
      
      .term.grouped {
        transform: scale(1.1);
        box-shadow: 0 4px 8px rgba(0,0,0,0.2);
      }
      
      .operator {
        font-size: 20px;
        margin: 0 10px;
        color: #666;
      }
      
      button {
        margin: 10px;
        padding: 10px 20px;
        background-color: #2196f3;
        color: white;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        font-size: 14px;
      }
      
      button:hover {
        background-color: #1976d2;
      }
      
      .result {
        margin-top: 20px;
        font-size: 20px;
        font-weight: bold;
        color: #2e7d32;
        min-height: 30px;
      }
    `,
    js: `
      function groupTerms() {
        const terms = document.querySelectorAll('.term');
        terms.forEach(term => {
          term.classList.add('grouped');
        });
        
        document.getElementById('result').innerHTML = 
          '同类项已分组：<span style="color: #1565c0;">x项</span> 和 <span style="color: #7b1fa2;">y项</span>';
      }
      
      function combineTerms() {
        document.querySelector('.expression').innerHTML = 
          '<span class="term term-x grouped">7x</span>' +
          '<span class="operator">+</span>' +
          '<span class="term term-y grouped">2y</span>';
        
        document.getElementById('result').innerHTML = 
          '合并过程：(2x + 5x) + (3y - y) = 7x + 2y';
      }
      
      function showResult() {
        document.querySelector('.expression').innerHTML = 
          '<span style="font-size: 28px; color: #2e7d32; font-weight: bold;">7x + 2y</span>';
        
        document.getElementById('result').innerHTML = 
          '最终结果：<strong>7x + 2y</strong>';
      }
      
      function reset() {
        document.querySelector('.expression').innerHTML = 
          '<span class="term term-x">2x</span>' +
          '<span class="operator">+</span>' +
          '<span class="term term-y">3y</span>' +
          '<span class="operator">+</span>' +
          '<span class="term term-x">5x</span>' +
          '<span class="operator">-</span>' +
          '<span class="term term-y">y</span>';
        
        document.getElementById('result').innerHTML = '';
      }
    `,
    instructions: '按顺序点击按钮，观察同类项如何分组和合并。注意相同颜色表示同类项。'
  }
];

// 答案模板（用于生成标准化的反馈）
export const answerTemplates = {
  correct: [
    '太棒了！你的答案完全正确！',
    '很好！你完全理解了这个概念。',
    '正确！看来你已经掌握了这个知识点。',
    '优秀！你的解题思路很清晰。'
  ],
  partiallyCorrect: [
    '你的思路是对的，但计算上有一点小错误。',
    '方向对了！让我们一起完善一下解答。',
    '很接近了！再仔细检查一下计算过程。'
  ],
  incorrect: [
    '没关系，让我们一起分析这道题。',
    '这道题确实有一定难度，我来帮你理解。',
    '每个人都会犯错，重要的是从中学习。'
  ],
  encouragement: [
    '继续加油！你的进步很明显。',
    '很好的尝试！数学需要多练习。',
    '保持这种学习热情！你一定能掌握的。'
  ]
};
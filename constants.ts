
import { SkiGoal } from './types';

export const SKI_GOALS: SkiGoal[] = [
  // --- 双板 (SKI) ---
  {
    id: 'ski-beg-adapt',
    discipline: 'SKI',
    category: '初级阶段',
    title: '基础适应',
    description: '穿脱雪板、平地行走、踏步转弯。',
    keyPoints: ['平衡感', '板刃感知', '身体重心控制']
  },
  {
    id: 'ski-beg-plow-stop',
    discipline: 'SKI',
    category: '初级阶段',
    title: '犁式制动',
    description: '通过板尾推雪实现减速和停止。',
    keyPoints: ['板尾推雪', '膝盖内扣', '对称压力']
  },
  {
    id: 'ski-beg-plow-turn',
    discipline: 'SKI',
    category: '初级阶段',
    title: '犁式转弯',
    description: '利用重心转移实现基础的左右转向。',
    keyPoints: ['重心转移', '外板承重', '身体转动']
  },
  {
    id: 'ski-int-semi-para',
    discipline: 'SKI',
    category: '中级阶段',
    title: '半犁式转弯',
    description: '从犁式入弯过渡到平行出弯。',
    keyPoints: ['入弯并板', '重心平滑过渡', '板刃切换']
  },
  {
    id: 'ski-int-para',
    discipline: 'SKI',
    category: '中级阶段',
    title: '基础平行转弯',
    description: '全过程中平行，练习引申与释放。',
    keyPoints: ['双板平行', '上下引申', '压力释放']
  },
  {
    id: 'ski-int-pole',
    discipline: 'SKI',
    category: '中级阶段',
    title: '点杖技术',
    description: '建立滑行节奏，增强稳定性。',
    keyPoints: ['点杖位置', '节奏同步', '手臂姿态']
  },
  {
    id: 'ski-adv-carving',
    discipline: 'SKI',
    category: '高级阶段',
    title: '刻滑 (Carving)',
    description: '追求纯净雪痕，利用侧切弧度。',
    keyPoints: ['纯刃滑行', '身体倾斜', '向心力对抗']
  },
  {
    id: 'ski-adv-gs',
    discipline: 'SKI',
    category: '高级阶段',
    title: '竞技大回转',
    description: '高速状态下的极致控制。',
    keyPoints: ['高速稳定性', '大幅度倾斜', '连续压强']
  },

  // --- 单板 (SNOWBOARD) ---
  {
    id: 'sb-beg-skating',
    discipline: 'SNOWBOARD',
    category: '初级阶段',
    title: '单脚滑动',
    description: '适应单脚固定在雪板上的平衡。',
    keyPoints: ['中心站姿', '视线引导', '后脚蹬冰']
  },
  {
    id: 'sb-beg-slipping',
    discipline: 'SNOWBOARD',
    category: '初级阶段',
    title: '前后刃推坡',
    description: '板刃控制速度的核心技术。',
    keyPoints: ['脚踝控制', '视线抬起', '核心收紧']
  },
  {
    id: 'sb-beg-leaf',
    discipline: 'SNOWBOARD',
    category: '初级阶段',
    title: '落叶飘',
    description: '在坡面上横向左右平移。',
    keyPoints: ['重心侧移', '视线先行', '膝盖微屈']
  },
  {
    id: 'sb-int-turns',
    discipline: 'SNOWBOARD',
    category: '中级阶段',
    title: 'C型与S型换刃',
    description: '滑行中流畅切换前刃与后刃。',
    keyPoints: ['换刃时机', '身体轴转', '重心平移']
  },
  {
    id: 'sb-int-carve',
    discipline: 'SNOWBOARD',
    category: '中级阶段',
    title: '基础刻滑',
    description: '切雪而非推雪的走刃初探。',
    keyPoints: ['立刃角度', '板刃咬合', '重心稳定']
  },
  {
    id: 'sb-int-weight',
    discipline: 'SNOWBOARD',
    category: '中级阶段',
    title: '重心切换',
    description: '动态调节重心应对坡度变化。',
    keyPoints: ['前后配比', '动态调节', '垂直压板']
  },
  {
    id: 'sb-adv-euro',
    discipline: 'SNOWBOARD',
    category: '高级阶段',
    title: '高级刻滑 (Euro Carve)',
    description: '手触雪面的极致成角技术。',
    keyPoints: ['极致成角', '大幅反弓', '手触雪面']
  },
  {
    id: 'sb-adv-tricks',
    discipline: 'SNOWBOARD',
    category: '高级阶段',
    title: '平地花式 (Ground Tricks)',
    description: '利用雪板弹性的转体与平衡。',
    keyPoints: ['雪板弹性', '起跳时机', '空中姿态']
  }
];

export const SKI_COACH_SYSTEM_PROMPT = `
你是一位名为 "SkiPro AI" 的顶级专业滑雪教练。

你的回复必须极致精简、直接，适合移动端快速阅读。

回复格式要求：
1. 请使用标准的 Markdown 标题（### 标题内容）。
2. 每个部分的文字描述不超过 3 行。
3. 使用 Emoji 增强可读性。

回复结构：
### 🧭 教练综述
[一句话评价总体状态]

### 🔍 关键动作分析
- [动作点1]：[简短描述肢体位置]
- [动作点2]：[简短描述肢体位置]

### 💡 核心改进方案
1. [建议1]
2. [建议2]

### ⛷️ 推荐练习 (Drill)
[推荐1个具体练习名称及目的]

### 📊 专业评分
[10分制分数]
`;

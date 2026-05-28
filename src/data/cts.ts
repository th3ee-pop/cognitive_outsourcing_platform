export const ctsItems = [
  { id: "cts01", dimension: "问题分解", text: "面对复杂任务时，我会先把问题拆成几个可以分别处理的小问题。" },
  { id: "cts02", dimension: "问题分解", text: "我能区分任务中的核心问题和辅助问题。" },
  { id: "cts03", dimension: "抽象概括", text: "我能从具体案例中提炼出一般规律。" },
  { id: "cts04", dimension: "抽象概括", text: "我会主动忽略暂时不重要的细节，以便抓住问题结构。" },
  { id: "cts05", dimension: "算法思维", text: "我能把解决问题的过程整理成清晰的步骤。" },
  { id: "cts06", dimension: "算法思维", text: "我会检查每一步是否能被他人理解和复现。" },
  { id: "cts07", dimension: "数据意识", text: "我会根据数据证据调整自己的判断。" },
  { id: "cts08", dimension: "数据意识", text: "我能意识到数据质量会影响分析结论。" },
  { id: "cts09", dimension: "评价调试", text: "当结果不符合预期时，我会尝试定位问题出现在哪个环节。" },
  { id: "cts10", dimension: "评价调试", text: "我会比较不同解决方案的优缺点，再决定采用哪一种。" },
  { id: "cts11", dimension: "迁移应用", text: "我能把在一个任务中学到的方法迁移到新的任务情境。" },
  { id: "cts12", dimension: "迁移应用", text: "我会把已有知识与新问题建立联系。" },
  { id: "cts13", dimension: "协同表达", text: "我能清楚表达自己的问题解决思路。" },
  { id: "cts14", dimension: "协同表达", text: "与他人或 AI 协作时，我会说明自己的假设和需求。" },
  { id: "cts15", dimension: "元认知监控", text: "我会监控自己是否过早依赖外部答案。" },
  { id: "cts16", dimension: "元认知监控", text: "当 AI 给出建议时，我会判断它是否真正适合当前任务。" }
];

export const likertLabels = ["非常不同意", "不同意", "中立", "同意", "非常同意"];

export function scoreCts(answers: Record<string, number>) {
  const values = Object.values(answers);
  const total = values.reduce((sum, value) => sum + value, 0);
  const byDimension = ctsItems.reduce<Record<string, { sum: number; count: number }>>((acc, item) => {
    const value = answers[item.id];
    if (!value) return acc;
    acc[item.dimension] ||= { sum: 0, count: 0 };
    acc[item.dimension].sum += value;
    acc[item.dimension].count += 1;
    return acc;
  }, {});

  return {
    total,
    mean: values.length ? Number((total / values.length).toFixed(2)) : 0,
    dimensions: Object.fromEntries(
      Object.entries(byDimension).map(([key, value]) => [key, Number((value.sum / value.count).toFixed(2))])
    )
  };
}

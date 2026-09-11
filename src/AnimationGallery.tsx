import { useRef, useState } from 'react'
import { Button, Card, Space, Tag, Typography } from 'antd'
import {
  AnimatePresence,
  MotionConfig,
  motion,
  useReducedMotion,
} from 'motion/react'

const colors = ['#6875ed', '#ad75da', '#35a6a0']

/** 无 props；返回支持重复播放和手动交互的 Motion 动画示例区。 */
export default function AnimationGallery() {
  const [replay, setReplay] = useState(0)
  const [clicks, setClicks] = useState(0)
  const [items, setItems] = useState(['山间日落', '城市夜景', '雨后森林'])
  const [expanded, setExpanded] = useState(false)
  const dragArea = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()

  /** 重播入场动画；无参数，无返回值。 */
  function replayEntrance() {
    setReplay(replay + 1)
  }
  /** 累加点击反馈次数；无参数，无返回值。 */
  function countClick() {
    setClicks(clicks + 1)
  }
  /** 反转演示列表以触发布局动画；无参数，无返回值。 */
  function reverseItems() {
    setItems([...items].reverse())
  }
  /** 展开或收起详情；无参数，无返回值。 */
  function toggleDetails() {
    setExpanded(!expanded)
  }

  return (
    <MotionConfig reducedMotion="user">
      <section aria-labelledby="animation-title" className="animation-section">
        <div className="section-heading">
          <div>
            <Typography.Title id="animation-title" level={2}>
              Motion 动画实验室
            </Typography.Title>
            <Typography.Paragraph type="secondary">
              移动鼠标、点击按钮或拖动方块，感受不同的动画效果。
            </Typography.Paragraph>
          </div>
          <Tag color="purple">Motion · 动画库</Tag>
        </div>
        {reduced && (
          <Typography.Paragraph type="secondary">
            已遵循系统的减少动态效果设置，位移和缩放动画将简化。
          </Typography.Paragraph>
        )}
        <div className="gallery-grid">
          <Card
            title="01 / 依次入场"
            extra={<Button onClick={replayEntrance}>重播入场</Button>}
          >
            <Typography.Paragraph type="secondary">
              卡片依次淡入并上移，适合图片列表首次加载。
            </Typography.Paragraph>
            <div className="animation-stage entrance-stage" key={replay}>
              {colors.map(
                /** 接收颜色和序号，返回错峰入场的示例卡片。 */
                (color, index) => (
                  <motion.div
                    className="entrance-tile"
                    key={color}
                    style={{ background: color }}
                    initial={{ opacity: 0, y: reduced ? 0 : 32 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: reduced ? 0 : 0.5,
                      delay: reduced ? 0 : index * 0.18,
                    }}
                  >
                    0{index + 1}
                  </motion.div>
                ),
              )}
            </div>
          </Card>
          <Card title="02 / 悬停与按压">
            <Typography.Paragraph type="secondary">
              悬停时放大，按下时收缩；也可以用键盘聚焦并按 Enter。
            </Typography.Paragraph>
            <div className="animation-stage interaction-stage">
              <motion.button
                className="motion-button"
                whileHover={reduced ? undefined : { scale: 1.08, y: -4 }}
                whileTap={reduced ? undefined : { scale: 0.94 }}
                transition={{ type: 'spring', stiffness: 400, damping: 18 }}
                onClick={countClick}
              >
                点击感受弹性
              </motion.button>
              <Typography.Text aria-live="polite" type="secondary">
                已点击 {clicks} 次
              </Typography.Text>
            </div>
          </Card>
          <Card
            title="03 / 列表重排"
            extra={<Button onClick={reverseItems}>反转顺序</Button>}
          >
            <Typography.Paragraph type="secondary">
              点击反转，观察每一项平滑移动到新位置。
            </Typography.Paragraph>
            <ul className="motion-list" aria-label="动画排序示例">
              {items.map(
                /** 接收条目名称，返回保留身份的布局动画列表项。 */
                (item) => (
                  <motion.li
                    layout
                    key={item}
                    transition={{ type: 'spring', stiffness: 260, damping: 25 }}
                  >
                    <span className="motion-dot" />
                    {item}
                    <span className="motion-list-label">示例图片</span>
                  </motion.li>
                ),
              )}
            </ul>
          </Card>
          <Card title="04 / 拖拽回弹">
            <Typography.Paragraph type="secondary">
              在虚线区域内拖动方块，松手后自动弹回原位。
            </Typography.Paragraph>
            <div className="animation-stage drag-stage" ref={dragArea}>
              <motion.div
                className="drag-tile"
                drag
                dragConstraints={dragArea}
                dragElastic={0.12}
                dragSnapToOrigin
                dragTransition={{ bounceStiffness: 350, bounceDamping: 22 }}
                whileDrag={reduced ? undefined : { scale: 1.08, rotate: 5 }}
                aria-label="可拖动的演示方块"
              >
                拖动我
              </motion.div>
            </div>
          </Card>
          <Card className="table-card" title="05 / 展开与退出">
            <Space orientation="vertical" className="full-width" size="middle">
              <Typography.Text type="secondary">
                适合详情面板、帮助信息和可折叠内容。
              </Typography.Text>
              <Button
                onClick={toggleDetails}
                aria-expanded={expanded}
                aria-controls="motion-details"
              >
                {expanded ? '收起详情' : '展开详情'}
              </Button>
              <AnimatePresence initial={false}>
                {expanded && (
                  <motion.div
                    id="motion-details"
                    key="details"
                    className="motion-details"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: reduced ? 0 : 0.3 }}
                  >
                    <div className="motion-details-content">
                      <Typography.Title level={4}>
                        让内容自然出现
                      </Typography.Title>
                      <Typography.Paragraph>
                        这个面板同时过渡高度与透明度。收起时先播放退出动画，再移除内容，下方页面也随之移动。
                      </Typography.Paragraph>
                      <Tag color="purple">适用于图片详情与参数说明</Tag>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </Space>
          </Card>
        </div>
      </section>
    </MotionConfig>
  )
}

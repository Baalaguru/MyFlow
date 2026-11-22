import { useEffect, useRef, type ReactNode } from 'react'
import * as echarts from 'echarts/core'
import { BarChart } from 'echarts/charts'
import { GridComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

echarts.use([BarChart, GridComponent, TooltipComponent, CanvasRenderer])

export function ResponsiveCard({
  title,
  children,
  span = 'normal',
}: {
  title: string
  children: ReactNode
  span?: 'normal' | 'wide'
}) {
  return (
    <section className={`panel p-5 ${span === 'wide' ? 'sm:col-span-2' : ''}`.trim()}>
      {title ? <h3 className="mb-3 text-base">{title}</h3> : null}
      <div className="text-sm">{children}</div>
    </section>
  )
}

export function StatCard({
  caption,
  value,
  detail,
}: {
  caption: string
  value: string
  detail: string
}) {
  return (
    <section className="panel p-5">
      <p className="eyebrow">{caption}</p>
      <p className="stat-number mt-2">{value}</p>
      <p className="muted mt-2 text-xs">{detail}</p>
    </section>
  )
}

export interface DataTableProps {
  columns: { key: string; label: string }[]
  rows: Record<string, string>[]
  caption: string
}

export function DataTable({ columns, rows, caption }: DataTableProps) {
  return (
    <div className="panel overflow-x-auto">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b" style={{ borderColor: 'var(--mf-border)' }}>
            {columns.map((column) => (
              <th key={column.key} scope="col" className="px-4 py-3 font-medium">
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-b last:border-0" style={{ borderColor: 'var(--mf-border)' }}>
              {columns.map((column) => (
                <td key={column.key} className="px-4 py-3">
                  {row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export interface BarGraphProps {
  labels: string[]
  values: number[]
  colors: string[]
  description: string
  axisColor?: string
  gridColor?: string
}

export function BarGraph({
  labels,
  values,
  colors,
  description,
  axisColor = '#8A7A66',
  gridColor = 'rgba(185, 167, 140, 0.35)',
}: BarGraphProps) {
  const container = useRef<HTMLDivElement>(null)
  const signature = JSON.stringify({ labels, values, colors, axisColor, gridColor })

  useEffect(() => {
    if (!container.current) return
    const data = JSON.parse(signature) as Pick<
      BarGraphProps,
      'labels' | 'values' | 'colors' | 'axisColor' | 'gridColor'
    >
    const chart = echarts.init(container.current, undefined, { renderer: 'canvas' })
    chart.setOption({
      animation: false,
      grid: { left: 36, right: 12, top: 12, bottom: 28 },
      xAxis: {
        type: 'category',
        data: data.labels,
        axisLabel: { color: data.axisColor, fontSize: 11 },
        axisLine: { lineStyle: { color: data.axisColor } },
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: data.axisColor, fontSize: 11 },
        splitLine: { lineStyle: { color: data.gridColor } },
      },
      series: [
        {
          type: 'bar',
          data: data.values.map((value, index) => ({
            value,
            itemStyle: { color: data.colors[index % data.colors.length] },
          })),
          barWidth: '55%',
        },
      ],
    })
    const observer = new ResizeObserver(() => chart.resize())
    observer.observe(container.current)
    return () => {
      observer.disconnect()
      chart.dispose()
    }
  }, [signature])

  return (
    <div
      ref={container}
      className="h-48 w-full"
      role="img"
      aria-label={description}
      data-testid="bar-graph"
    />
  )
}

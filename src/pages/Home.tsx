import { Stethoscope, HeartHandshake } from "lucide-react";
import VolunteerForm from "@/components/VolunteerForm";
import VolunteerList from "@/components/VolunteerList";
import CalendarHeader from "@/components/CalendarHeader";
import ScheduleGrid from "@/components/ScheduleGrid";
import BottomBar from "@/components/BottomBar";

export default function Home() {
  return (
    <div className="min-h-screen bg-schedule-bg pb-32">
      <header className="bg-gradient-to-r from-medical-blue-dark via-medical-blue to-medical-blue-dark text-white shadow-lg sticky top-0 z-30">
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center backdrop-blur-sm">
                <Stethoscope className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-xl font-bold flex items-center gap-2">
                  街道养老站 · 陪诊志愿者排班看板
                  <HeartHandshake className="w-5 h-5 text-orange-200" />
                </h1>
                <p className="text-sm opacity-85 mt-0.5">
                  协调员专用 · 自动检测排班冲突 · 支持拖拽调整
                </p>
              </div>
            </div>

            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2 opacity-90">
                <span className="w-2.5 h-2.5 rounded-full bg-green-300 animate-pulse" />
                <span>本地运行 · 数据不上传</span>
              </div>
              <div className="hidden lg:flex items-center gap-4 text-xs opacity-75">
                <span>📌 点击空格子分配老人</span>
                <span>📌 拖动老人标签调整</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-6 py-6">
        <div className="flex gap-6">
          <aside className="w-[300px] shrink-0 space-y-0">
            <div className="sticky top-[88px]">
              <VolunteerForm />
              <VolunteerList />
            </div>
          </aside>

          <section className="flex-1 min-w-0">
            <CalendarHeader />
            <ScheduleGrid />

            <div className="mt-6 card p-5 bg-gradient-to-br from-medical-blue-light/40 to-orange-50/40 border-medical-blue/20">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-white shadow-sm flex items-center justify-center shrink-0">
                  <span className="text-xl">💡</span>
                </div>
                <div className="flex-1 text-sm text-gray-600 space-y-1.5">
                  <p className="font-bold text-gray-800 text-base">操作提示</p>
                  <ul className="space-y-1 ml-1">
                    <li>• <span className="font-medium text-medical-blue-dark">左侧录入</span>：填写志愿者姓名、可服务日期/时段、陪诊上限人数</li>
                    <li>• <span className="font-medium text-medical-blue-dark">添加老人</span>：点击任意可用空格子，输入老人姓名即可完成分配</li>
                    <li>• <span className="font-medium text-medical-blue-dark">调整排班</span>：拖动老人标签（显示「👴 XX」）到其他格子即可重新分配</li>
                    <li>• <span className="font-medium text-red-600">冲突标红</span>：红色边框格子表示存在冲突，鼠标悬停 ⚠️ 可查看详情</li>
                    <li>• <span className="font-medium text-medical-orange-dark">导出打印</span>：点击右下角按钮导出本周排班为可打印 HTML 文件</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      <BottomBar />
    </div>
  );
}

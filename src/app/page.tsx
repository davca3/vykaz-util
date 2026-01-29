'use client'

import { UserSettings } from '@/components/UserSettings'
import { WorkScheduleSettings } from '@/components/WorkScheduleSettings'
import { MonthSelector } from '@/components/MonthSelector'
import { TimesheetTable } from '@/components/TimesheetTable'
import { Summary } from '@/components/Summary'
import { ExportButtons } from '@/components/ExportButtons'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-6 px-4">
        <h1 className="text-3xl font-bold text-center mb-6">
          Výkaz práce
        </h1>

        <Tabs defaultValue="timesheet" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="settings">Nastavení</TabsTrigger>
            <TabsTrigger value="timesheet">Výkaz</TabsTrigger>
            <TabsTrigger value="export">Export</TabsTrigger>
          </TabsList>

          <TabsContent value="settings" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <UserSettings />
              <MonthSelector />
            </div>
            <WorkScheduleSettings />
          </TabsContent>

          <TabsContent value="timesheet" className="space-y-6">
            <TimesheetTable />
            <Summary />
          </TabsContent>

          <TabsContent value="export" className="space-y-6">
            <Summary />
            <ExportButtons />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  )
}

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
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="timesheet">Výkaz</TabsTrigger>
            <TabsTrigger value="settings">Nastavení</TabsTrigger>
          </TabsList>

          <TabsContent value="timesheet" className="space-y-6">
            <MonthSelector />
            <TimesheetTable />
            <Summary />
            <ExportButtons />
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <UserSettings />
            <WorkScheduleSettings />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  )
}

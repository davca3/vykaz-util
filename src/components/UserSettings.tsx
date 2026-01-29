'use client'

import { useTimesheetStore } from '@/store/timesheet-store'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useRef } from 'react'

export function UserSettings() {
  const { settings, setSettings } = useTimesheetStore()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const base64 = event.target?.result as string
      setSettings({ signatureImage: base64 })
    }
    reader.readAsDataURL(file)
  }

  const removeSignature = () => {
    setSettings({ signatureImage: undefined })
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">Údaje zaměstnance</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="firstName" className="text-sm">Jméno</Label>
            <Input
              id="firstName"
              value={settings.firstName}
              onChange={(e) => setSettings({ firstName: e.target.value })}
              placeholder="Jan"
              className="h-9"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="lastName" className="text-sm">Příjmení</Label>
            <Input
              id="lastName"
              value={settings.lastName}
              onChange={(e) => setSettings({ lastName: e.target.value })}
              placeholder="Novák"
              className="h-9"
            />
          </div>
        </div>

        <div className="space-y-1">
          <Label htmlFor="employeeNumber" className="text-sm">Číslo zaměstnance</Label>
          <Input
            id="employeeNumber"
            value={settings.employeeNumber}
            onChange={(e) => setSettings({ employeeNumber: e.target.value })}
            placeholder="123456"
            className="h-9 w-32"
          />
        </div>

        <div className="space-y-2 pt-2 border-t">
          <Label className="text-sm">Podpis</Label>
          {settings.signatureImage ? (
            <div className="flex items-center gap-3">
              <div className="p-2 border rounded bg-white">
                <img
                  src={settings.signatureImage}
                  alt="Podpis"
                  className="max-h-12 object-contain"
                />
              </div>
              <Button variant="outline" size="sm" onClick={removeSignature}>
                Změnit
              </Button>
            </div>
          ) : (
            <Input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleSignatureUpload}
              className="h-9"
            />
          )}
        </div>
      </CardContent>
    </Card>
  )
}

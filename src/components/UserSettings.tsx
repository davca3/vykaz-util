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
      <CardHeader>
        <CardTitle>Nastavení uživatele</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">Jméno</Label>
            <Input
              id="firstName"
              value={settings.firstName}
              onChange={(e) => setSettings({ firstName: e.target.value })}
              placeholder="Jan"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Příjmení</Label>
            <Input
              id="lastName"
              value={settings.lastName}
              onChange={(e) => setSettings({ lastName: e.target.value })}
              placeholder="Novák"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="employeeNumber">Číslo zaměstnance</Label>
          <Input
            id="employeeNumber"
            value={settings.employeeNumber}
            onChange={(e) => setSettings({ employeeNumber: e.target.value })}
            placeholder="123456"
          />
        </div>

        <div className="space-y-2">
          <Label>Podpis (obrázek)</Label>
          <div className="flex items-center gap-4">
            <Input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleSignatureUpload}
              className="flex-1"
            />
            {settings.signatureImage && (
              <Button variant="destructive" size="sm" onClick={removeSignature}>
                Odstranit
              </Button>
            )}
          </div>
          {settings.signatureImage && (
            <div className="mt-2 p-2 border rounded">
              <img
                src={settings.signatureImage}
                alt="Podpis"
                className="max-h-16 object-contain"
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

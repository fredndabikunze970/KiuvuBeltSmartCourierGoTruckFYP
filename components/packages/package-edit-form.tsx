"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { apiService, type Branch, type Car, type Driver, type Package } from "@/lib/api"
import React, { useEffect, useState } from "react"

interface Props {
  pkg: Package
  onSaved?: (pkg: Package) => void
}

export function PackageEditForm({ pkg, onSaved }: Props) {
  const [form, setForm] = useState<any>({})
  const [branches, setBranches] = useState<Branch[]>([])
  const [cars, setCars] = useState<Car[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    setForm({
      sender_name: pkg.sender_name,
      sender_phone: pkg.sender_phone,
      sender_address: pkg.sender_address,
      receiver_name: pkg.receiver_name,
      receiver_phone: pkg.receiver_phone,
      receiver_address: pkg.receiver_address,
      package_type: pkg.package_description ? 'standard' : 'standard',
      weight: pkg.weight,
      dimensions: pkg.dimensions,
      declared_value: pkg.declared_value,
      delivery_fee: pkg.delivery_fee,
      priority: pkg.priority,
      origin_branch_id: pkg.origin_branch_id ? String(pkg.origin_branch_id) : 'none',
      destination_branch_id: pkg.destination_branch_id ? String(pkg.destination_branch_id) : 'none',
      assigned_car: pkg.assigned_car ? String(pkg.assigned_car) : 'none',
      assigned_driver: pkg.assigned_driver ? String(pkg.assigned_driver) : 'none',
      delivery_time: pkg.delivery_time ? (() => {
        const d = new Date(pkg.delivery_time)
        const pad = (n: number) => String(n).padStart(2, '0')
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
      })() : '',
    })

    ;(async () => {
      try {
        const [b, c, d] = await Promise.all([apiService.getBranches(), apiService.getCars(), apiService.getDrivers()])
        setBranches(b.branches || [])
        setCars(c.cars || [])
        setDrivers(d.drivers || [])
      } catch (e) {
        console.error('Failed to load auxiliary data', e)
      }
    })()
  }, [pkg])

  const onChange = (field: string, value: any) => {
    setForm((s: any) => ({ ...s, [field]: value }))
  }

  const getBranchName = (id: string | null | undefined) => {
    if (!id || id === 'none') return 'None'
    const found = branches.find((b) => String(b.branch_id) === String(id))
    return found ? found.branch_name : String(id)
  }

  const getCarLabel = (id: string | null | undefined) => {
    if (!id || id === 'none') return 'Unassigned'
    const found = cars.find((c) => String(c.car_id) === String(id))
    return found ? `${found.model} • ${found.plate_number}` : String(id)
  }

  const getDriverName = (id: string | null | undefined) => {
    if (!id || id === 'none') return 'Unassigned'
    const found = drivers.find((d) => String(d.driver_id) === String(id))
    return found ? found.full_name : String(id)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const payload: any = { ...form }
      // Convert numeric fields
      if (payload.weight !== undefined) payload.weight = Number(payload.weight)
      if (payload.declared_value !== undefined) payload.declared_value = Number(payload.declared_value)
      if (payload.delivery_fee !== undefined) payload.delivery_fee = Number(payload.delivery_fee)

  // Normalize select 'none' values to null and keep ids as strings
  if (payload.assigned_car === 'none') payload.assigned_car = null
  else if (payload.assigned_car !== undefined && payload.assigned_car !== null) payload.assigned_car = String(payload.assigned_car)

  if (payload.assigned_driver === 'none') payload.assigned_driver = null
  else if (payload.assigned_driver !== undefined && payload.assigned_driver !== null) payload.assigned_driver = String(payload.assigned_driver)

  // Branch ids
  if (payload.origin_branch_id === 'none') payload.origin_branch_id = null
  else if (payload.origin_branch_id !== undefined && payload.origin_branch_id !== null) payload.origin_branch_id = String(payload.origin_branch_id)

  if (payload.destination_branch_id === 'none') payload.destination_branch_id = null
  else if (payload.destination_branch_id !== undefined && payload.destination_branch_id !== null) payload.destination_branch_id = String(payload.destination_branch_id)

      const res = await apiService.updatePackage(pkg.package_id, payload)
      toast({ title: 'Package Updated', description: 'Package details saved successfully.' })
      if (onSaved) onSaved(res.package)
    } catch (err) {
      toast({ title: 'Update failed', description: String(err), variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Sender & Receiver</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Sender Name</Label>
              <Input value={form.sender_name || ''} onChange={(e) => onChange('sender_name', e.target.value)} />
            </div>
            <div>
              <Label>Sender Phone</Label>
              <Input value={form.sender_phone || ''} onChange={(e) => onChange('sender_phone', e.target.value)} />
            </div>
          </div>

          <div className="mt-3">
            <Label>Sender Address</Label>
            <Textarea value={form.sender_address || ''} onChange={(e) => onChange('sender_address', e.target.value)} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <Label>Receiver Name</Label>
              <Input value={form.receiver_name || ''} onChange={(e) => onChange('receiver_name', e.target.value)} />
            </div>
            <div>
              <Label>Receiver Phone</Label>
              <Input value={form.receiver_phone || ''} onChange={(e) => onChange('receiver_phone', e.target.value)} />
            </div>
          </div>

          <div className="mt-3">
            <Label>Receiver Address</Label>
            <Textarea value={form.receiver_address || ''} onChange={(e) => onChange('receiver_address', e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Package Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={(v) => onChange('priority', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="express">Express</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Delivery Fee</Label>
              <Input type="number" value={form.delivery_fee ?? ''} onChange={(e) => onChange('delivery_fee', e.target.value)} />
            </div>
            <div>
              <Label>Weight (kg)</Label>
              <Input type="number" value={form.weight ?? ''} onChange={(e) => onChange('weight', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <Label>Origin Branch</Label>
              <p className="text-xs text-muted-foreground mb-1">Current: {getBranchName(form.origin_branch_id)}</p>
              <Select value={form.origin_branch_id ?? 'none'} onValueChange={(v) => onChange('origin_branch_id', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select origin branch" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {branches.map((b) => (
                    <SelectItem key={b.branch_id} value={String(b.branch_id)}>{b.branch_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Destination Branch</Label>
              <p className="text-xs text-muted-foreground mb-1">Current: {getBranchName(form.destination_branch_id)}</p>
              <Select value={form.destination_branch_id ?? 'none'} onValueChange={(v) => onChange('destination_branch_id', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select destination branch" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {branches.map((b) => (
                    <SelectItem key={b.branch_id} value={String(b.branch_id)}>{b.branch_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-4">
            <Label>Package Description</Label>
            <Textarea value={form.package_description || ''} onChange={(e) => onChange('package_description', e.target.value)} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <Label>Dimensions</Label>
              <Input value={form.dimensions || ''} onChange={(e) => onChange('dimensions', e.target.value)} />
            </div>
            <div>
              <Label>Declared Value</Label>
              <Input type="number" value={form.declared_value ?? ''} onChange={(e) => onChange('declared_value', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <Label>Expected Delivery Time</Label>
              <Input type="datetime-local" value={form.delivery_time || ''} onChange={(e) => onChange('delivery_time', e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Assignment</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Assign Vehicle</Label>
              <p className="text-xs text-muted-foreground mb-1">Current: {getCarLabel(form.assigned_car)}</p>
              <Select value={form.assigned_car ?? 'none'} onValueChange={(v) => onChange('assigned_car', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {cars.map((c) => (
                    <SelectItem key={c.car_id} value={String(c.car_id)}>{c.model} - {c.plate_number}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Assign Driver</Label>
              <p className="text-xs text-muted-foreground mb-1">Current: {getDriverName(form.assigned_driver)}</p>
              <Select value={form.assigned_driver ?? 'none'} onValueChange={(v) => onChange('assigned_driver', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {drivers.map((d) => (
                    <SelectItem key={d.driver_id} value={String(d.driver_id)}>{d.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save Changes'}</Button>
      </div>
    </form>
  )
}

export default PackageEditForm

"use client"

import { useState, useEffect } from "react"
import { MainLayout } from "@/components/layout/main-layout"
import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Edit, Trash2, RefreshCw, Clock, Users as UsersIcon, Save, Info, ShieldCheck, Eye, EyeOff } from "lucide-react"
import { toast } from "@/components/ui/use-toast"

interface User {
  id: string
  username: string
  fullName: string
  password: string
  role: "admin" | "user" | "super_admin"
  assignedSteps: string[]
}

interface StageTat {
  id: string
  stage_key: string
  stage_label: string
  tat_minutes: number
  description: string
  updated_at?: string
}

const allSteps = [
  { id: "dashboard", label: "Dashboard" },
  { id: "order-acceptable", label: "Order Acceptable" },
  { id: "check-inventory", label: "Check Inventory" },
  { id: "material-received", label: "Material Received" },
  { id: "senior-approval", label: "Senior Approval" },
  { id: "pre-invoice", label: "Pre Invoice" },
  { id: "make-invoice", label: "Make Invoice" },
  { id: "make-pi", label: "Make PI" },
  { id: "warehouse", label: "Warehouse" },
  { id: "warehouse-material", label: "Warehouse (Material RCVD)" },
  { id: "calibration", label: "Calibration Certificate" },
  { id: "update-delivery", label: "Update Delivery" },
  { id: "order-cancel", label: "Order Cancel" },
  { id: "credit-note", label: "Credit Note" },
  { id: "service-intimation", label: "Service Intimation" },
  { id: "settings", label: "Settings" },
]

export default function SettingsPage() {
  const { user: currentUser } = useAuth()
  
  // Tab state
  const [activeTab, setActiveTab] = useState("users")

  // Users State
  const [users, setUsers] = useState<User[]>([])
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [userLoading, setUserLoading] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [userFormData, setUserFormData] = useState({
    username: "",
    fullName: "",
    password: "",
    role: "user" as "admin" | "user",
    assignedSteps: [] as string[],
  })

  // TAT State
  const [stageTats, setStageTats] = useState<StageTat[]>([])
  const [tatLoading, setTatLoading] = useState(true)
  const [isTatDialogOpen, setIsTatDialogOpen] = useState(false)
  const [editingTat, setEditingTat] = useState<StageTat | null>(null)
  const [tatFormData, setTatFormData] = useState({
    days: "5",
    hours: "0",
    minutes: "0",
    totalMinutes: 7200,
    description: "",
  })
  const [savingTat, setSavingTat] = useState(false)

  // Fetch users from Supabase API
  const fetchUsers = async () => {
    setUserLoading(true)
    try {
      const response = await fetch("/api/otp-supabase/users")
      const result = await response.json()

      if (result.success && Array.isArray(result.data)) {
        const usersData: User[] = result.data.map((u: any) => ({
          id: u.id,
          username: u.username,
          fullName: u.full_name,
          password: u.password_hash || "",
          role: u.role || "user",
          assignedSteps: Array.isArray(u.assigned_steps) ? u.assigned_steps : [],
        }))
        setUsers(usersData)
      }
    } catch (error) {
      console.error("Error fetching users:", error)
    } finally {
      setUserLoading(false)
    }
  }

  // Fetch Stage TAT from Supabase API
  const fetchStageTats = async () => {
    setTatLoading(true)
    try {
      const response = await fetch("/api/otp-supabase/tat")
      const result = await response.json()

      if (result.success && Array.isArray(result.data)) {
        setStageTats(result.data)
      }
    } catch (error) {
      console.error("Error fetching TAT data:", error)
      toast({
        title: "Failed to load TAT data",
        description: "Could not fetch stage TAT settings from database.",
        variant: "destructive",
      })
    } finally {
      setTatLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
    fetchStageTats()
  }, [])

  useEffect(() => {
    if (activeTab === "tat") {
      fetchStageTats()
    }
  }, [activeTab])

  // User Handlers
  const handleAddUser = () => {
    setEditingUser(null)
    setUserFormData({
      username: "",
      fullName: "",
      password: "",
      role: "user",
      assignedSteps: [],
    })
    setShowPassword(false)
    setIsUserDialogOpen(true)
  }

  const handleEditUser = (user: User) => {
    setEditingUser(user)
    setUserFormData({
      username: user.username,
      fullName: user.fullName,
      password: user.password,
      role: user.role === "admin" ? "admin" : "user",
      assignedSteps: user.assignedSteps,
    })
    setShowPassword(true)
    setIsUserDialogOpen(true)
  }

  const handleDeleteUser = async (userId: string) => {
    const userToDelete = users.find((u) => u.id === userId)
    if (!userToDelete) return

    try {
      const response = await fetch(`/api/otp-supabase/users?id=${encodeURIComponent(userId)}`, {
        method: "DELETE",
      })

      const result = await response.json()

      if (result.success) {
        await fetchUsers()
        toast({
          title: "User deleted",
          description: `${userToDelete.username} has been removed successfully.`,
        })
      } else {
        throw new Error(result.error || "Delete failed")
      }
    } catch (error: any) {
      console.error("Error deleting user:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to delete user. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleUserSubmit = async () => {
    if (!userFormData.username || !userFormData.fullName || (!editingUser && !userFormData.password)) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      })
      return
    }

    try {
      let response: Response
      if (editingUser) {
        response = await fetch("/api/otp-supabase/users", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingUser.id,
            username: userFormData.username,
            full_name: userFormData.fullName,
            password: userFormData.password || undefined,
            role: userFormData.role,
            assigned_steps: userFormData.assignedSteps,
          }),
        })
      } else {
        response = await fetch("/api/otp-supabase/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: userFormData.username,
            full_name: userFormData.fullName,
            password: userFormData.password,
            role: userFormData.role,
            assigned_steps: userFormData.assignedSteps,
          }),
        })
      }

      const result = await response.json()

      if (result.success) {
        await fetchUsers()
        setIsUserDialogOpen(false)
        toast({
          title: editingUser ? "User updated" : "User created",
          description: `${userFormData.username} has been ${editingUser ? "updated" : "created"} successfully.`,
        })
      } else {
        throw new Error(result.error || "Operation failed")
      }
    } catch (error: any) {
      console.error("Error saving user:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to save user. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleStepChange = (stepId: string, checked: boolean) => {
    if (checked) {
      setUserFormData((prev) => ({
        ...prev,
        assignedSteps: [...prev.assignedSteps, stepId],
      }))
    } else {
      setUserFormData((prev) => ({
        ...prev,
        assignedSteps: prev.assignedSteps.filter((s) => s !== stepId),
      }))
    }
  }

  // TAT Handlers
  const handleEditTat = (tat: StageTat) => {
    setEditingTat(tat)
    const totalMinutes = tat.tat_minutes || 0
    const days = Math.floor(totalMinutes / 1440)
    const remainingAfterDays = totalMinutes % 1440
    const hours = Math.floor(remainingAfterDays / 60)
    const minutes = remainingAfterDays % 60

    setTatFormData({
      days: String(days),
      hours: String(hours),
      minutes: String(minutes),
      totalMinutes: totalMinutes,
      description: tat.description || "",
    })
    setIsTatDialogOpen(true)
  }

  const handleTatFieldChange = (field: "days" | "hours" | "minutes", val: string) => {
    const numVal = Math.max(0, parseInt(val, 10) || 0)
    const newDays = field === "days" ? numVal : Math.max(0, parseInt(tatFormData.days, 10) || 0)
    const newHours = field === "hours" ? numVal : Math.max(0, parseInt(tatFormData.hours, 10) || 0)
    const newMinutes = field === "minutes" ? numVal : Math.max(0, parseInt(tatFormData.minutes, 10) || 0)

    const calculatedTotal = newDays * 1440 + newHours * 60 + newMinutes

    setTatFormData((prev) => ({
      ...prev,
      [field]: val,
      totalMinutes: calculatedTotal,
    }))
  }

  const handleTotalMinutesDirectChange = (val: string) => {
    const total = Math.max(0, parseInt(val, 10) || 0)
    const days = Math.floor(total / 1440)
    const remainingAfterDays = total % 1440
    const hours = Math.floor(remainingAfterDays / 60)
    const minutes = remainingAfterDays % 60

    setTatFormData({
      days: String(days),
      hours: String(hours),
      minutes: String(minutes),
      totalMinutes: total,
      description: tatFormData.description,
    })
  }

  const handleTatSave = async () => {
    if (!editingTat) return
    setSavingTat(true)

    try {
      const response = await fetch("/api/otp-supabase/tat", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingTat.id,
          stage_key: editingTat.stage_key,
          tat_minutes: tatFormData.totalMinutes,
          description: tatFormData.description,
        }),
      })

      const result = await response.json()

      if (result.success) {
        await fetchStageTats()
        setIsTatDialogOpen(false)
        toast({
          title: "TAT Updated",
          description: `Turnaround Time for ${editingTat.stage_label} updated to ${tatFormData.totalMinutes} minutes.`,
        })
      } else {
        throw new Error(result.error || "Failed to update TAT")
      }
    } catch (error: any) {
      console.error("Error updating TAT:", error)
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update TAT. Please try again.",
        variant: "destructive",
      })
    } finally {
      setSavingTat(false)
    }
  }

  const formatTatDisplay = (minutes: number) => {
    if (minutes === 0) return { primary: "0 Minutes (Same Day)", secondary: "Immediate" }
    const days = (minutes / 1440).toFixed(minutes % 1440 === 0 ? 0 : 1)
    const hours = (minutes / 60).toFixed(minutes % 60 === 0 ? 0 : 1)
    return {
      primary: `${days} Day${Number(days) === 1 ? "" : "s"} (${minutes.toLocaleString()} mins)`,
      secondary: `${hours} Hours`,
    }
  }

  if (currentUser?.role !== "admin" && currentUser?.role !== "super_admin") {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">Access Denied</h2>
            <p className="text-gray-600">You don't have permission to access Settings.</p>
          </div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
              Settings
            </h1>
            <p className="text-muted-foreground">Manage users, access permissions, and stage Turnaround Times (TAT)</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                fetchUsers()
                fetchStageTats()
              }}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            {activeTab === "users" && (
              <Button onClick={handleAddUser} className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white">
                <Plus className="h-4 w-4 mr-2" />
                Add User
              </Button>
            )}
          </div>
        </div>

        {/* Tabs for User Management & TAT Management */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
            <TabsTrigger value="users" className="flex items-center gap-2 font-medium">
              <UsersIcon className="h-4 w-4" />
              User Management
            </TabsTrigger>
            <TabsTrigger value="tat" className="flex items-center gap-2 font-medium">
              <Clock className="h-4 w-4" />
              TAT Management
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: User Management */}
          <TabsContent value="users" className="space-y-4">
            <Card className="border shadow-sm">
              <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl flex items-center gap-2">
                      <ShieldCheck className="h-5 w-5 text-indigo-600" />
                      User Management
                    </CardTitle>
                    <CardDescription>Manage application accounts, credentials, and stage access permissions</CardDescription>
                  </div>
                  <Badge variant="outline" className="font-mono">
                    {users.length} Active Users
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {userLoading ? (
                  <div className="flex items-center justify-center h-48">
                    <RefreshCw className="h-6 w-6 animate-spin text-indigo-600" />
                    <span className="ml-2 text-muted-foreground">Loading users...</span>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-slate-50 dark:bg-slate-900">
                        <TableRow>
                          <TableHead className="w-[150px]">Username</TableHead>
                          <TableHead className="w-[180px]">Name</TableHead>
                          <TableHead className="w-[120px]">Role</TableHead>
                          <TableHead>Assigned Steps</TableHead>
                          <TableHead className="w-[100px] text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users.map((user) => (
                          <TableRow key={user.id} className="hover:bg-slate-50/70 transition-colors">
                            <TableCell className="font-semibold text-slate-800 dark:text-slate-200">{user.username}</TableCell>
                            <TableCell>{user.fullName}</TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  user.role === "super_admin"
                                    ? "destructive"
                                    : user.role === "admin"
                                    ? "default"
                                    : "secondary"
                                }
                                className="capitalize text-xs font-semibold"
                              >
                                {user.role.replace("_", " ")}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {user.assignedSteps.includes("all") || user.assignedSteps.length >= 14 ? (
                                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
                                    All Steps (Full Access)
                                  </Badge>
                                ) : user.assignedSteps.length === 0 ? (
                                  <span className="text-xs text-muted-foreground italic">No steps assigned</span>
                                ) : (
                                  user.assignedSteps.map((step) => (
                                    <Badge key={step} variant="outline" className="text-xs bg-slate-50 text-slate-700 border-slate-200">
                                      {allSteps.find((s) => s.id === step)?.label || step}
                                    </Badge>
                                  ))
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => handleEditUser(user)}>
                                  <Edit className="h-4 w-4 text-slate-600 hover:text-indigo-600" />
                                </Button>
                                <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50" onClick={() => handleDeleteUser(user.id)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                        {users.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                              No users found in database
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 2: TAT Management */}
          <TabsContent value="tat" className="space-y-4">
            <Card className="border shadow-sm">
              <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-xl flex items-center gap-2">
                      <Clock className="h-5 w-5 text-indigo-600" />
                      Stage Turnaround Time (TAT) Configuration
                    </CardTitle>
                    <CardDescription>
                      Configure the target SLA time (in minutes/days) for each pipeline stage. Planned dates and non-negative delays are automatically calculated based on these values.
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 px-3 py-1.5 rounded-md text-xs font-medium border border-indigo-100">
                    <Info className="h-4 w-4 shrink-0" />
                    Independent OTP TAT Pipeline
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {tatLoading ? (
                  <div className="flex items-center justify-center h-48">
                    <RefreshCw className="h-6 w-6 animate-spin text-indigo-600" />
                    <span className="ml-2 text-muted-foreground">Loading stage TATs...</span>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-slate-50 dark:bg-slate-900">
                        <TableRow>
                          <TableHead className="w-[80px]">#</TableHead>
                          <TableHead className="w-[240px]">Pipeline Stage</TableHead>
                          <TableHead className="w-[180px]">Target TAT</TableHead>
                          <TableHead className="w-[120px]">Minutes</TableHead>
                          <TableHead>Calculation Rule / Description</TableHead>
                          <TableHead className="w-[100px] text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {stageTats.map((tat, index) => {
                          const tatDisplay = formatTatDisplay(tat.tat_minutes)
                          return (
                            <TableRow key={tat.stage_key} className="hover:bg-slate-50/70 transition-colors">
                              <TableCell className="font-mono text-xs text-muted-foreground font-semibold">
                                {index + 1}
                              </TableCell>
                              <TableCell>
                                <div className="font-semibold text-slate-900 dark:text-slate-100">{tat.stage_label}</div>
                                <div className="text-xs font-mono text-muted-foreground">{tat.stage_key}</div>
                              </TableCell>
                              <TableCell>
                                <div className="font-medium text-indigo-700 dark:text-indigo-400">{tatDisplay.primary}</div>
                                <div className="text-xs text-muted-foreground">{tatDisplay.secondary}</div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="secondary" className="font-mono font-medium">
                                  {tat.tat_minutes.toLocaleString()} m
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm text-slate-600 dark:text-slate-300">
                                {tat.description || "—"}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => handleEditTat(tat)}>
                                  <Edit className="h-3.5 w-3.5 text-indigo-600" />
                                  Edit TAT
                                </Button>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                        {stageTats.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                              No TAT configurations found. Click Refresh to initialize defaults.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* DIALOG: User Create/Edit */}
        <Dialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingUser ? "Edit User Account" : "Add New User"}</DialogTitle>
              <DialogDescription>
                {editingUser ? "Update credentials, role, and assigned pipeline steps" : "Create a new user profile with specific stage permissions"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username *</Label>
                  <Input
                    id="username"
                    value={userFormData.username}
                    onChange={(e) => setUserFormData((prev) => ({ ...prev, username: e.target.value }))}
                    placeholder="e.g. jdoe"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name *</Label>
                  <Input
                    id="fullName"
                    value={userFormData.fullName}
                    onChange={(e) => setUserFormData((prev) => ({ ...prev, fullName: e.target.value }))}
                    placeholder="e.g. John Doe"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Password {editingUser ? "" : "*"}</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={userFormData.password}
                      onChange={(e) => setUserFormData((prev) => ({ ...prev, password: e.target.value }))}
                      placeholder="Enter password"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role *</Label>
                  <Select
                    value={userFormData.role}
                    onValueChange={(value: "admin" | "user") => setUserFormData((prev) => ({ ...prev, role: value }))}
                  >
                    <SelectTrigger id="role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User (Assigned Steps Only)</SelectItem>
                      <SelectItem value="admin">Admin (Full Access & Settings)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Assigned Step Access</Label>
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="p-0 h-auto text-xs text-indigo-600"
                    onClick={() => {
                      if (userFormData.assignedSteps.length === allSteps.length) {
                        setUserFormData((prev) => ({ ...prev, assignedSteps: [] }))
                      } else {
                        setUserFormData((prev) => ({ ...prev, assignedSteps: allSteps.map((s) => s.id) }))
                      }
                    }}
                  >
                    {userFormData.assignedSteps.length === allSteps.length ? "Deselect All" : "Select All Steps"}
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border rounded-md p-3 bg-slate-50/50">
                  {allSteps.map((step) => (
                    <div key={step.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={step.id}
                        checked={userFormData.assignedSteps.includes(step.id)}
                        onCheckedChange={(checked) => handleStepChange(step.id, checked as boolean)}
                      />
                      <Label htmlFor={step.id} className="text-sm font-normal cursor-pointer">
                        {step.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setIsUserDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleUserSubmit}
                  disabled={!userFormData.username || !userFormData.fullName || (!editingUser && !userFormData.password)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  {editingUser ? "Update User" : "Create User"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* DIALOG: Stage TAT Edit */}
        <Dialog open={isTatDialogOpen} onOpenChange={setIsTatDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-indigo-600" />
                Edit Stage Turnaround Time (TAT)
              </DialogTitle>
              <DialogDescription>
                Configure the planned duration for <span className="font-semibold text-foreground">{editingTat?.stage_label}</span>.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="bg-slate-50 dark:bg-slate-900 p-3.5 rounded-lg border space-y-3">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Duration Breakdown</div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="tatDays" className="text-xs">Days (1440m/d)</Label>
                    <Input
                      id="tatDays"
                      type="number"
                      min="0"
                      value={tatFormData.days}
                      onChange={(e) => handleTatFieldChange("days", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="tatHours" className="text-xs">Hours (60m/h)</Label>
                    <Input
                      id="tatHours"
                      type="number"
                      min="0"
                      max="23"
                      value={tatFormData.hours}
                      onChange={(e) => handleTatFieldChange("hours", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="tatMinutes" className="text-xs">Minutes</Label>
                    <Input
                      id="tatMinutes"
                      type="number"
                      min="0"
                      max="59"
                      value={tatFormData.minutes}
                      onChange={(e) => handleTatFieldChange("minutes", e.target.value)}
                    />
                  </div>
                </div>

                <div className="pt-2 border-t flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total TAT in Minutes:</span>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="0"
                      className="w-28 h-8 font-mono text-right font-semibold"
                      value={tatFormData.totalMinutes}
                      onChange={(e) => handleTotalMinutesDirectChange(e.target.value)}
                    />
                    <span className="font-mono text-xs text-muted-foreground">mins</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tatDescription">Description / Rule Details</Label>
                <Input
                  id="tatDescription"
                  value={tatFormData.description}
                  onChange={(e) => setTatFormData((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="e.g. 5 working days from order creation"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setIsTatDialogOpen(false)} disabled={savingTat}>
                  Cancel
                </Button>
                <Button onClick={handleTatSave} disabled={savingTat} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
                  {savingTat ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save TAT Changes
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  )
}

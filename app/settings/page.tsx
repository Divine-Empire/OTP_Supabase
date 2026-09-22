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
import { Plus, Edit, Trash2, RefreshCw, Clock, Users as UsersIcon, Save, ShieldCheck, Eye, EyeOff, Lock, ListTree, Search } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { TAT_STAGE_OPTIONS, minutesToDHM, dhmToMinutes, formatDHM } from "./tat-helpers"
import { formatCategoryLabel } from "./dropdown-helpers"

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

interface DropdownOption {
  id: string
  category: string
  value: string
  sort_order: number
}

// Kept in sync with the sidebar's own menuItems (components/layout/sidebar.tsx).
const allSteps = [
  { id: "dashboard", label: "Dashboard" },
  { id: "order-acceptable", label: "Order Acceptable" },
  { id: "proforma-invoice", label: "Pro-Forma Invoice" },
  { id: "check-inventory", label: "Check Inventory" },
  { id: "material-received", label: "Material Received" },
  { id: "pre-invoice", label: "Pre Invoice Details" },
  { id: "debit-note-for-invoice", label: "Debit Note (Inv.)" },
  { id: "make-invoice", label: "Make Invoice" },
  { id: "calibration", label: "Calibration Certificate" },
  { id: "debit-note", label: "Debit Note" },
  { id: "settings", label: "Settings" },
]

export default function SettingsPage() {
  const { user: currentUser } = useAuth()

  // Tab state
  const [activeTab, setActiveTab] = useState<"users" | "tat" | "dropdown">("users")

  // Users State
  const [users, setUsers] = useState<User[]>([])
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [userLoading, setUserLoading] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set())
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
    days: "0",
    hours: "0",
    minutes: "0",
    totalMinutes: 0,
    description: "",
  })
  const [savingTat, setSavingTat] = useState(false)

  // Dropdown State
  const [dropdownOptions, setDropdownOptions] = useState<DropdownOption[]>([])
  const [dropdownLoading, setDropdownLoading] = useState(true)
  const [isDropdownDialogOpen, setIsDropdownDialogOpen] = useState(false)
  const [editingDropdownOption, setEditingDropdownOption] = useState<DropdownOption | null>(null)
  const [dropdownFormData, setDropdownFormData] = useState({
    category: "",
    value: "",
  })
  const [dropdownCardFilters, setDropdownCardFilters] = useState<Record<string, string>>({})
  const [savingDropdown, setSavingDropdown] = useState(false)

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

  // Fetch dropdown options from Supabase API
  const fetchDropdownOptions = async () => {
    setDropdownLoading(true)
    try {
      const response = await fetch("/api/otp-supabase/dropdowns")
      const result = await response.json()

      if (result.success && Array.isArray(result.data)) {
        setDropdownOptions(result.data)
      }
    } catch (error) {
      console.error("Error fetching dropdown options:", error)
      toast({
        title: "Failed to load dropdowns",
        description: "Could not fetch dropdown options from database.",
        variant: "destructive",
      })
    } finally {
      setDropdownLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
    fetchStageTats()
    fetchDropdownOptions()
  }, [])

  const togglePasswordVisibility = (userId: string) => {
    setVisiblePasswords((prev) => {
      const next = new Set(prev)
      if (next.has(userId)) next.delete(userId)
      else next.add(userId)
      return next
    })
  }

  const handleRefresh = () => {
    if (activeTab === "users") fetchUsers()
    else if (activeTab === "dropdown") fetchDropdownOptions()
    else fetchStageTats()
  }

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
      // A pre-existing admin's stored assignedSteps might predate this
      // full-access rule — normalize it to every step the moment the dialog
      // opens, same as a fresh admin selection would.
      assignedSteps: user.role === "admin" ? allSteps.map((s) => s.id) : user.assignedSteps,
    })
    setShowPassword(true)
    setIsUserDialogOpen(true)
  }

  // Admins always get every page — picking "Admin" auto-checks (and locks)
  // every step in the grid below, so the stored assignedSteps never drifts
  // out of sync with what an admin actually sees in the sidebar.
  const handleRoleChange = (value: "admin" | "user") => {
    setUserFormData((prev) => ({
      ...prev,
      role: value,
      assignedSteps: value === "admin" ? allSteps.map((s) => s.id) : prev.assignedSteps,
    }))
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

    // Safety net: an admin always gets every step, regardless of what the
    // checkbox grid happened to hold when Save was clicked.
    const finalAssignedSteps = userFormData.role === "admin" ? allSteps.map((s) => s.id) : userFormData.assignedSteps

    try {
      let response: Response
      if (editingUser) {
        response = await fetch("/api/otp-supabase/users", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingUser.id,
            username: userFormData.username,
            fullName: userFormData.fullName,
            password: userFormData.password || undefined,
            role: userFormData.role,
            assignedSteps: finalAssignedSteps,
          }),
        })
      } else {
        response = await fetch("/api/otp-supabase/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: userFormData.username,
            fullName: userFormData.fullName,
            password: userFormData.password,
            role: userFormData.role,
            assignedSteps: finalAssignedSteps,
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
    const { days, hours, minutes } = minutesToDHM(tat.tat_minutes || 0)

    setTatFormData({
      days: String(days),
      hours: String(hours),
      minutes: String(minutes),
      totalMinutes: tat.tat_minutes || 0,
      description: tat.description || "",
    })
    setIsTatDialogOpen(true)
  }

  const handleTatFieldChange = (field: "days" | "hours" | "minutes", val: string) => {
    const numVal = Math.max(0, parseInt(val, 10) || 0)
    const newDays = field === "days" ? numVal : Math.max(0, parseInt(tatFormData.days, 10) || 0)
    const newHours = field === "hours" ? numVal : Math.max(0, parseInt(tatFormData.hours, 10) || 0)
    const newMinutes = field === "minutes" ? numVal : Math.max(0, parseInt(tatFormData.minutes, 10) || 0)

    const calculatedTotal = dhmToMinutes(newDays, newHours, newMinutes)

    setTatFormData((prev) => ({
      ...prev,
      [field]: val,
      totalMinutes: calculatedTotal,
    }))
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
          title: "TAT updated",
          description: `Turnaround Time for ${editingTat.stage_label} set to ${formatDHM(tatFormData.totalMinutes)}.`,
        })
      } else {
        throw new Error(result.error || "Failed to save TAT")
      }
    } catch (error: any) {
      console.error("Error saving TAT:", error)
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save TAT. Please try again.",
        variant: "destructive",
      })
    } finally {
      setSavingTat(false)
    }
  }

  // Dropdown Handlers — values only; categories themselves are fixed
  // (whatever otp_dropdown already has rows for), enforced both here (the
  // Select only lists existing categories) and server-side in the POST
  // handler.
  const dropdownCategories = Array.from(new Set(dropdownOptions.map((o) => o.category))).sort()
  const dropdownGroups = dropdownCategories.map((category) => ({
    category,
    options: dropdownOptions.filter((o) => o.category === category),
  }))

  const setDropdownCardFilter = (category: string, term: string) =>
    setDropdownCardFilters((prev) => ({ ...prev, [category]: term }))

  const handleAddDropdownValue = (category: string) => {
    setEditingDropdownOption(null)
    setDropdownFormData({ category, value: "" })
    setIsDropdownDialogOpen(true)
  }

  const handleEditDropdownValue = (option: DropdownOption) => {
    setEditingDropdownOption(option)
    setDropdownFormData({ category: option.category, value: option.value })
    setIsDropdownDialogOpen(true)
  }

  const handleDeleteDropdownValue = async (option: DropdownOption) => {
    if (!confirm(`Delete "${option.value}" from ${formatCategoryLabel(option.category)}?`)) return

    try {
      const response = await fetch(`/api/otp-supabase/dropdowns?id=${encodeURIComponent(option.id)}`, {
        method: "DELETE",
      })
      const result = await response.json()

      if (result.success) {
        await fetchDropdownOptions()
        toast({ title: "Value deleted", description: `"${option.value}" removed from ${formatCategoryLabel(option.category)}.` })
      } else {
        throw new Error(result.error || "Delete failed")
      }
    } catch (error: any) {
      console.error("Error deleting dropdown value:", error)
      toast({ title: "Error", description: error.message || "Failed to delete value.", variant: "destructive" })
    }
  }

  const handleDropdownSave = async () => {
    if (!dropdownFormData.category || !dropdownFormData.value.trim()) {
      toast({ title: "Missing information", description: "Category and value are required.", variant: "destructive" })
      return
    }

    setSavingDropdown(true)
    try {
      let response: Response
      if (editingDropdownOption) {
        response = await fetch("/api/otp-supabase/dropdowns", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingDropdownOption.id,
            value: dropdownFormData.value.trim(),
          }),
        })
      } else {
        response = await fetch("/api/otp-supabase/dropdowns", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            category: dropdownFormData.category,
            value: dropdownFormData.value.trim(),
          }),
        })
      }

      const result = await response.json()

      if (result.success) {
        await fetchDropdownOptions()
        setIsDropdownDialogOpen(false)
        toast({
          title: editingDropdownOption ? "Value updated" : "Value added",
          description: `"${dropdownFormData.value.trim()}" ${editingDropdownOption ? "updated in" : "added to"} ${formatCategoryLabel(dropdownFormData.category)}.`,
        })
      } else {
        throw new Error(result.error || "Failed to save value")
      }
    } catch (error: any) {
      console.error("Error saving dropdown value:", error)
      toast({ title: "Save Failed", description: error.message || "Failed to save value. Please try again.", variant: "destructive" })
    } finally {
      setSavingDropdown(false)
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
      <div className="p-2">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "users" | "tat" | "dropdown")}>
          <Card>
            <CardHeader className="border-b py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <TabsList>
                  <TabsTrigger value="users" className="gap-2 font-medium">
                    <UsersIcon className="h-4 w-4" />
                    User Management
                  </TabsTrigger>
                  <TabsTrigger value="tat" className="gap-2 font-medium">
                    <Clock className="h-4 w-4" />
                    TAT Management
                  </TabsTrigger>
                  <TabsTrigger value="dropdown" className="gap-2 font-medium">
                    <ListTree className="h-4 w-4" />
                    Dropdown
                  </TabsTrigger>
                </TabsList>

                {activeTab === "users" && (
                  <div className="flex items-center gap-2">
                    <Button onClick={handleRefresh} variant="outline" size="sm">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh
                    </Button>
                    <Button size="sm" onClick={handleAddUser} className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white">
                      <Plus className="h-4 w-4 mr-2" />
                      Add User
                    </Button>
                  </div>
                )}

                {activeTab === "dropdown" && (
                  <div className="flex items-center gap-2">
                    <Button onClick={handleRefresh} variant="outline" size="sm">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {/* TAB 1: User Management */}
              <TabsContent value="users" className="mt-0">
                <div className="flex items-center justify-between px-4 py-3 border-b bg-slate-50/50">
                  <p className="text-sm text-muted-foreground">Manage application accounts, credentials, and stage access permissions</p>
                  <Badge variant="outline" className="font-mono shrink-0">
                    {users.length} Active Users
                  </Badge>
                </div>
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
                          <TableHead className="w-[100px]">Actions</TableHead>
                          <TableHead className="w-[180px]">Full Name</TableHead>
                          <TableHead className="w-[150px]">Username</TableHead>
                          <TableHead className="w-[140px]">Password</TableHead>
                          <TableHead className="w-[120px]">Role</TableHead>
                          <TableHead>Page Access</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users.map((user) => (
                          <TableRow key={user.id} className="hover:bg-slate-50/70 transition-colors">
                            <TableCell>
                              <div className="flex gap-1">
                                <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => handleEditUser(user)}>
                                  <Edit className="h-4 w-4 text-slate-600 hover:text-indigo-600" />
                                </Button>
                                <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50" onClick={() => handleDeleteUser(user.id)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                            <TableCell>{user.fullName}</TableCell>
                            <TableCell className="font-semibold text-slate-800 dark:text-slate-200">{user.username}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1.5 font-mono text-sm">
                                <span>{visiblePasswords.has(user.id) ? user.password || "—" : "••••••••"}</span>
                                <button
                                  type="button"
                                  onClick={() => togglePasswordVisibility(user.id)}
                                  className="text-gray-400 hover:text-gray-600"
                                  tabIndex={-1}
                                >
                                  {visiblePasswords.has(user.id) ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                </button>
                              </div>
                            </TableCell>
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
                                {user.role === "admin" ||
                                user.assignedSteps.includes("all") ||
                                user.assignedSteps.length >= allSteps.length ? (
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
                          </TableRow>
                        ))}
                        {users.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                              No users found in database
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>

              {/* TAB 2: TAT Management */}
              <TabsContent value="tat" className="mt-0">
                <div className="flex items-center justify-between px-4 py-3 border-b bg-slate-50/50">
                  <p className="text-sm text-muted-foreground">
                    Each stage's planned date = the previous stage's record creation time + its TAT duration below.
                  </p>
                </div>
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
                          <TableHead className="w-[80px]">S No.</TableHead>
                          <TableHead className="w-[220px]">Stage Name</TableHead>
                          <TableHead className="w-[180px]">TAT Duration</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="w-[100px] text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {stageTats.map((tat, index) => (
                          <TableRow key={tat.stage_key} className="hover:bg-slate-50/70 transition-colors">
                            <TableCell className="font-mono text-xs text-muted-foreground font-semibold">
                              {index + 1}
                            </TableCell>
                            <TableCell>
                              <div className="font-semibold text-slate-900 dark:text-slate-100">{tat.stage_label}</div>
                              <div className="text-xs font-mono text-muted-foreground">{tat.stage_key}</div>
                            </TableCell>
                            <TableCell>
                              <div className="font-medium text-indigo-700 dark:text-indigo-400">{formatDHM(tat.tat_minutes)}</div>
                            </TableCell>
                            <TableCell className="text-sm text-slate-600 dark:text-slate-300">
                              {tat.description || "—"}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => handleEditTat(tat)}>
                                <Edit className="h-3.5 w-3.5 text-indigo-600" />
                                Edit
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                        {stageTats.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                              No TAT configurations found.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>

              {/* TAB 3: Dropdown */}
              <TabsContent value="dropdown" className="mt-0">
                <div className="px-4 py-3 border-b bg-slate-50/50">
                  <p className="text-sm text-muted-foreground">
                    Add, edit, or delete values within an existing dropdown category. New categories aren't creatable from here.
                  </p>
                </div>
                {dropdownLoading ? (
                  <div className="flex items-center justify-center h-48">
                    <RefreshCw className="h-6 w-6 animate-spin text-indigo-600" />
                    <span className="ml-2 text-muted-foreground">Loading dropdowns...</span>
                  </div>
                ) : (
                  <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {dropdownGroups.map(({ category, options }) => {
                      const filterTerm = (dropdownCardFilters[category] || "").toLowerCase()
                      const filteredOptions = filterTerm
                        ? options.filter((o) => o.value.toLowerCase().includes(filterTerm))
                        : options

                      return (
                        <Card key={category} className="flex flex-col">
                          <CardHeader className="flex flex-row items-center justify-between py-3 border-b space-y-0">
                            <div>
                              <CardTitle className="text-base">{formatCategoryLabel(category)}</CardTitle>
                              <CardDescription>{options.length} option{options.length === 1 ? "" : "s"}</CardDescription>
                            </div>
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-8 w-8 text-indigo-600 border-indigo-200 hover:bg-indigo-50 shrink-0"
                              onClick={() => handleAddDropdownValue(category)}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </CardHeader>
                          <CardContent className="p-3 space-y-2 flex-1">
                            <div className="relative">
                              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 h-3.5 w-3.5" />
                              <Input
                                placeholder="Filter options..."
                                value={dropdownCardFilters[category] || ""}
                                onChange={(e) => setDropdownCardFilter(category, e.target.value)}
                                className="pl-8 h-8 text-sm"
                              />
                            </div>
                            <div className="max-h-56 overflow-y-auto space-y-0.5">
                              {filteredOptions.map((option) => (
                                <div
                                  key={option.id}
                                  className="group flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-slate-50 text-sm"
                                >
                                  <span className="text-slate-800 dark:text-slate-200 truncate">{option.value}</span>
                                  <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-6 w-6"
                                      onClick={() => handleEditDropdownValue(option)}
                                    >
                                      <Edit className="h-3.5 w-3.5 text-slate-600 hover:text-indigo-600" />
                                    </Button>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-6 w-6 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                                      onClick={() => handleDeleteDropdownValue(option)}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                              {filteredOptions.length === 0 && (
                                <p className="text-center text-xs text-muted-foreground py-4">
                                  {filterTerm ? "No matches" : "No options yet"}
                                </p>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                    {dropdownGroups.length === 0 && (
                      <p className="col-span-full text-center text-muted-foreground py-12">No dropdown categories found.</p>
                    )}
                  </div>
                )}
              </TabsContent>
            </CardContent>
          </Card>
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
                  <Select value={userFormData.role} onValueChange={handleRoleChange}>
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
                  {userFormData.role === "admin" ? (
                    <span className="flex items-center gap-1 text-xs text-indigo-600 font-medium">
                      <Lock className="h-3 w-3" />
                      Auto-granted (Admin)
                    </span>
                  ) : (
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
                  )}
                </div>
                {userFormData.role === "admin" && (
                  <p className="text-xs text-muted-foreground">
                    Admins automatically get access to every page — the step list below is locked and informational only.
                  </p>
                )}
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border rounded-md p-3 bg-slate-50/50">
                  {allSteps.map((step) => (
                    <div key={step.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={step.id}
                        checked={userFormData.assignedSteps.includes(step.id)}
                        disabled={userFormData.role === "admin"}
                        onCheckedChange={(checked) => handleStepChange(step.id, checked as boolean)}
                      />
                      <Label
                        htmlFor={step.id}
                        className={`text-sm font-normal ${userFormData.role === "admin" ? "text-muted-foreground" : "cursor-pointer"}`}
                      >
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
              <div className="space-y-1">
                <Label>Pipeline Stage</Label>
                <p className="text-sm font-medium">{editingTat?.stage_label}</p>
                <p className="text-xs font-mono text-muted-foreground">
                  {TAT_STAGE_OPTIONS.find((s) => s.key === editingTat?.stage_key)?.plannedField}
                </p>
              </div>

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
                  <span className="text-muted-foreground">Total Duration:</span>
                  <span className="font-semibold text-indigo-700 dark:text-indigo-400">{formatDHM(tatFormData.totalMinutes)}</span>
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
                <Button
                  onClick={handleTatSave}
                  disabled={savingTat}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
                >
                  {savingTat ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save TAT Changes
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* DIALOG: Dropdown Value Add/Edit */}
        <Dialog open={isDropdownDialogOpen} onOpenChange={setIsDropdownDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ListTree className="h-5 w-5 text-indigo-600" />
                {editingDropdownOption ? "Edit Dropdown Value" : "Add Dropdown Value"}
              </DialogTitle>
              <DialogDescription>
                {editingDropdownOption ? "Update this value." : `Add a new value to ${formatCategoryLabel(dropdownFormData.category)}.`}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="dropdownCategory">Category</Label>
                <Input id="dropdownCategory" value={formatCategoryLabel(dropdownFormData.category)} disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dropdownValue">Value *</Label>
                <Input
                  id="dropdownValue"
                  value={dropdownFormData.value}
                  onChange={(e) => setDropdownFormData((prev) => ({ ...prev, value: e.target.value }))}
                  placeholder="Enter value"
                  autoFocus
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setIsDropdownDialogOpen(false)} disabled={savingDropdown}>
                  Cancel
                </Button>
                <Button
                  onClick={handleDropdownSave}
                  disabled={savingDropdown || !dropdownFormData.category || !dropdownFormData.value.trim()}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
                >
                  {savingDropdown ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {editingDropdownOption ? "Save Changes" : "Add Value"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  )
}

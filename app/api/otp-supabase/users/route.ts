import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase"

export async function GET() {
  try {
    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from("otp_users")
      .select("id, username, full_name, password_hash, role, assigned_steps, warehouse_page_access, location, is_active, created_at, updated_at")
      .order("created_at", { ascending: true })

    if (error) {
      console.error("Error fetching users:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: data || [] })
  } catch (err: any) {
    console.error("GET users exception:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const supabase = getSupabaseAdmin()

    // Login Action
    if (body.action === "login") {
      const { username, password } = body
      if (!username || !password) {
        return NextResponse.json(
          { success: false, error: "Username and password required" },
          { status: 400 }
        )
      }

      const cleanUsername = String(username).trim()
      const cleanPassword = String(password).trim()

      const { data: user, error } = await supabase
        .from("otp_users")
        .select("*")
        .ilike("username", cleanUsername)
        .eq("password_hash", cleanPassword)
        .single()

      if (error || !user) {
        console.error("Login attempt failed:", {
          username: cleanUsername,
          supabaseError: error?.message || "User not found or password mismatch",
        })
        return NextResponse.json(
          { 
            success: false, 
            error: error ? `Database error: ${error.message}` : "Invalid username or password" 
          },
          { status: 401 }
        )
      }

      if (!user.is_active) {
        return NextResponse.json(
          { success: false, error: "User account is disabled" },
          { status: 403 }
        )
      }

      const safeUser = {
        id: user.id,
        username: user.username,
        fullName: user.full_name,
        role: user.role,
        assignedSteps: user.assigned_steps || [],
        warehousePageAccess: user.warehouse_page_access || "",
        location: user.location || "",
      }

      return NextResponse.json({ success: true, user: safeUser })
    }

    // Create User Action (Settings page)
    const { username, fullName, password, role, assignedSteps, deployLink, warehousePageAccess, location } = body
    if (!username || !fullName) {
      return NextResponse.json(
        { success: false, error: "Username and Full Name are required" },
        { status: 400 }
      )
    }

    const { data: newUser, error: createErr } = await supabase
      .from("otp_users")
      .insert([{
        username,
        full_name: fullName,
        password_hash: password || "123456",
        role: role || "user",
        assigned_steps: assignedSteps || [],
        warehouse_page_access: warehousePageAccess || null,
        location: location || null,
      }])
      .select()
      .single()

    if (createErr) {
      console.error("Error creating user:", createErr)
      return NextResponse.json({ success: false, error: createErr.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: newUser })
  } catch (err: any) {
    console.error("POST users exception:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { id, username, fullName, password, role, assignedSteps, warehousePageAccess, location, isActive } = body

    if (!id && !username) {
      return NextResponse.json({ success: false, error: "User ID or username required" }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()
    const updateData: any = {}
    if (fullName !== undefined) updateData.full_name = fullName
    if (password !== undefined && password !== "") updateData.password_hash = password
    if (role !== undefined) updateData.role = role
    if (assignedSteps !== undefined) updateData.assigned_steps = assignedSteps
    if (warehousePageAccess !== undefined) updateData.warehouse_page_access = warehousePageAccess
    if (location !== undefined) updateData.location = location
    if (isActive !== undefined) updateData.is_active = isActive

    let query = supabase.from("otp_users").update(updateData)
    if (id) {
      query = query.eq("id", id)
    } else {
      query = query.eq("username", username)
    }

    const { data, error } = await query.select().single()

    if (error) {
      console.error("Error updating user:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (err: any) {
    console.error("PUT users exception:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    const username = searchParams.get("username")

    if (!id && !username) {
      return NextResponse.json({ success: false, error: "User ID or username required" }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()
    let query = supabase.from("otp_users").delete()
    if (id) query = query.eq("id", id)
    else query = query.eq("username", username!)

    const { error } = await query

    if (error) {
      console.error("Error deleting user:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: "User deleted" })
  } catch (err: any) {
    console.error("DELETE users exception:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

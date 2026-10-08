import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase"
import { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS, createSessionToken, readSessionFromRequest } from "@/lib/session"

// Passwords (stored plain-text, shown to admins in Settings) are only
// included when the caller holds a valid signed session cookie belonging to
// a user who is STILL an active admin right now — re-checked against the DB
// so a demoted/disabled admin's old cookie stops working immediately.
export async function GET(request: Request) {
  try {
    const supabase = getSupabaseAdmin()

    const session = readSessionFromRequest(request)
    let isAdmin = false
    if (session) {
      const { data: caller } = await supabase
        .from("otp_users")
        .select("role, is_active")
        .eq("id", session.uid)
        .maybeSingle()
      isAdmin = caller?.role === "admin" && caller?.is_active === true
    }

    const columns = "id, username, full_name, role, assigned_steps, assigned_crm_names, warehouse_page_access, location, default_godown, is_active, created_at, updated_at"
    const { data, error } = await supabase
      .from("otp_users")
      .select(isAdmin ? `${columns}, password_hash` : columns)
      .order("created_at", { ascending: true })

    if (error) {
      console.error("Error fetching users:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: data || [], passwordsVisible: isAdmin })
  } catch (err: any) {
    console.error("GET users exception:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const supabase = getSupabaseAdmin()

    if (body.action === "logout") {
      const res = NextResponse.json({ success: true })
      res.cookies.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 })
      return res
    }

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
        assignedCrmNames: user.assigned_crm_names || [],
        warehousePageAccess: user.warehouse_page_access || "",
        location: user.location || "",
        defaultGodown: user.default_godown || null,
      }

      const res = NextResponse.json({ success: true, user: safeUser })
      res.cookies.set(SESSION_COOKIE, createSessionToken(user.id, user.role), {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: SESSION_MAX_AGE_SECONDS,
      })
      return res
    }

    // Create User Action (Settings page)
    const { username, fullName, password, role, assignedSteps, assignedCrmNames, deployLink, warehousePageAccess, location, defaultGodown } = body
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
        assigned_crm_names: assignedCrmNames || [],
        warehouse_page_access: warehousePageAccess || null,
        location: location || null,
        default_godown: defaultGodown || null,
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
    const { id, username, fullName, password, role, assignedSteps, assignedCrmNames, warehousePageAccess, location, defaultGodown, isActive } = body

    if (!id && !username) {
      return NextResponse.json({ success: false, error: "User ID or username required" }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()
    const updateData: any = {}
    if (username !== undefined) updateData.username = username
    if (fullName !== undefined) updateData.full_name = fullName
    if (password !== undefined && password !== "") updateData.password_hash = password
    if (role !== undefined) updateData.role = role
    if (assignedSteps !== undefined) updateData.assigned_steps = assignedSteps
    if (assignedCrmNames !== undefined) updateData.assigned_crm_names = assignedCrmNames
    if (warehousePageAccess !== undefined) updateData.warehouse_page_access = warehousePageAccess
    if (location !== undefined) updateData.location = location
    if (defaultGodown !== undefined) updateData.default_godown = defaultGodown
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

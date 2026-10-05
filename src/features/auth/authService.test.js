import { describe, it, expect, vi, beforeEach } from "vitest"

const auth = {
  getSession: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChange: vi.fn(),
}
vi.mock("../../shared/supabaseClient", () => ({ supabase: { auth } }))

const { getCurrentUser, onAuthChange, signOut } = await import("./authService.js")

beforeEach(() => vi.clearAllMocks())

describe("getCurrentUser", () => {
  it("returns the session user", async () => {
    auth.getSession.mockResolvedValue({ data: { session: { user: { id: "u1" } } } })
    expect(await getCurrentUser()).toEqual({ id: "u1" })
  })

  it("returns null when signed out", async () => {
    auth.getSession.mockResolvedValue({ data: { session: null } })
    expect(await getCurrentUser()).toBeNull()
  })
})

describe("onAuthChange", () => {
  it("maps sessions to users and returns a working unsubscribe", () => {
    const unsubscribe = vi.fn()
    let listener
    auth.onAuthStateChange.mockImplementation((cb) => {
      listener = cb
      return { data: { subscription: { unsubscribe } } }
    })
    const onUser = vi.fn()

    const stop = onAuthChange(onUser)
    listener("SIGNED_IN", { user: { id: "u1" } })
    listener("SIGNED_OUT", null)
    stop()

    expect(onUser.mock.calls).toEqual([[{ id: "u1" }], [null]])
    expect(unsubscribe).toHaveBeenCalledOnce()
  })
})

describe("signOut", () => {
  it("delegates to Supabase", async () => {
    auth.signOut.mockResolvedValue({ error: null })
    await signOut()
    expect(auth.signOut).toHaveBeenCalledOnce()
  })
})

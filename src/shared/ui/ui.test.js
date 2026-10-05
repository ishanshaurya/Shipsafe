import { describe, it, expect } from "vitest"
import { createElement as h } from "react"
import { renderToStaticMarkup as render } from "react-dom/server"
import { MemoryRouter } from "react-router-dom"
import Button from "./Button"
import Field from "./Field"
import ErrorState from "./ErrorState"
import { SkeletonLines } from "./Skeleton"
import Progress from "./Progress"

describe("Button", () => {
  it("is a type=button with the variant and size classes", () => {
    const html = render(h(Button, { variant: "secondary", size: "sm", block: true }, "Run"))
    expect(html).toContain('type="button"')
    expect(html).toContain('class="btn btn-secondary btn-sm btn-block"')
  })

  it("shows a hidden spinner before the same label and disables itself while loading", () => {
    const html = render(h(Button, { loading: true }, "Run review"))
    expect(html).toContain("disabled")
    expect(html).toMatch(/<svg[^>]*aria-hidden="true"[^>]*>.*<\/svg>Run review/)
  })

  it("renders a link when given `to`", () => {
    const html = render(h(MemoryRouter, null, h(Button, { to: "/audit" }, "Go")))
    expect(html).toContain('href="/audit"')
  })
})

describe("Field", () => {
  it("ties the label to the control and links the hint", () => {
    const html = render(h(Field, { id: "x", label: "Context", hint: "Optional" }))
    expect(html).toContain('<label class="label" for="x">Context</label>')
    expect(html).toContain('aria-describedby="x-note"')
  })

  it("marks the control invalid and shows the error instead of the hint", () => {
    const html = render(h(Field, { id: "x", label: "Email", hint: "h", error: "Required" }))
    expect(html).toContain('aria-invalid="true"')
    expect(html).toContain("Required")
    expect(html).not.toContain(">h<")
  })

  it("puts the action beside the control", () => {
    const html = render(h(Field, { id: "x", label: "Search", action: h("button", null, "Go") }))
    expect(html).toMatch(/field-row"><input[^>]*\/><button>Go<\/button>/)
  })
})

describe("ErrorState", () => {
  it("is an alert, with a retry button only when a handler is given", () => {
    expect(render(h(ErrorState, { title: "Failed" }, "x"))).not.toContain("Try again")
    const html = render(h(ErrorState, { title: "Failed", onRetry: () => {} }, "x"))
    expect(html).toContain('role="alert"')
    expect(html).toContain("Try again")
  })
})

describe("SkeletonLines and Progress", () => {
  it("announce a label once and hide the bars", () => {
    const html = render(h(SkeletonLines, { label: "Loading report" }))
    expect(html).toContain('role="status"')
    expect(html).toContain("Loading report")
    expect(html.match(/aria-hidden="true"/g)).toHaveLength(3)
  })

  it("marks the current step and the finished ones", () => {
    const html = render(h(Progress, { steps: ["Connecting", "Analysing", "Building"], current: 1 }))
    expect(html).toContain('class="done">Connecting')
    expect(html).toContain('aria-current="step"')
  })
})

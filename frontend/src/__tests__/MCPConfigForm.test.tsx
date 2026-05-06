import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import MCPConfigForm from "../components/mcp/MCPConfigForm"

test("submits name, url, and auth when form is filled", async () => {
  const onSave = vi.fn().mockResolvedValue(undefined)
  render(<MCPConfigForm onSave={onSave} />)

  // Open dialog
  fireEvent.click(screen.getByRole("button", { name: /add mcp/i }))

  await userEvent.type(screen.getByLabelText(/name/i), "My MCP")
  await userEvent.type(screen.getByLabelText(/url/i), "http://localhost:9000/sse")
  fireEvent.click(screen.getByRole("button", { name: /save/i }))

  await waitFor(() => {
    expect(onSave).toHaveBeenCalledWith({
      name: "My MCP",
      url: "http://localhost:9000/sse",
      auth: { type: "none" }
    })
  })
})

test("does not submit when name is empty", async () => {
  const onSave = vi.fn()
  render(<MCPConfigForm onSave={onSave} />)
  fireEvent.click(screen.getByRole("button", { name: /add mcp/i }))
  await userEvent.type(screen.getByLabelText(/url/i), "http://localhost:9000/sse")
  fireEvent.click(screen.getByRole("button", { name: /save/i }))
  expect(onSave).not.toHaveBeenCalled()
})

import {
  ResizablePanel,
  ResizableHandle,
  ResizablePanelGroup,
} from "@/components/ui/resizable"

export default function Home() {
  return (
    <ResizablePanelGroup direction="horizontal" className="h-screen">
      <ResizablePanel defaultSize={20} minSize={10} maxSize={40} className="bg-gray-100">
        <div className="p-4">Navbar / Sidebar</div>
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel defaultSize={80}>
        <div className="p-4">Main Content</div>
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}

'use client';
import MainChart from "@/components/desk/Chart"
import ChartNav from "@/components/desk/Chart-nav"
import Orders from "@/components/desk/Orders"
import { OrdersProvider, useOrders } from "@/components/desk/OrdersContext"
import {
    ResizablePanel,
    ResizableHandle,
    ResizablePanelGroup,
} from "@/components/ui/resizable"

function DeskContent() {
    const { isOrdersCollapsed } = useOrders();
    
    // Adjust panel sizes based on orders drawer state
    // When collapsed, we only need space for the orders header bar (~48px)
    const chartSize = isOrdersCollapsed ? 92 : 70;
    const ordersSize = isOrdersCollapsed ? 8 : 30;

    return (
        <div className="fixed inset-0 overflow-hidden">
            <ResizablePanelGroup direction="horizontal" className="h-full w-full">
                <ResizablePanel defaultSize={80} className="border border-red-800">
                    <div className="p-4 h-full">
                        <ResizablePanelGroup direction="vertical" className="h-full">
                            <ResizablePanel 
                                defaultSize={chartSize} 
                                minSize={30}
                                key={`chart-${isOrdersCollapsed ? 'collapsed' : 'expanded'}`}
                            >
                                <div className="h-full">
                                    <MainChart/>
                                </div>
                            </ResizablePanel>
                            <ResizableHandle />
                            <ResizablePanel 
                                defaultSize={ordersSize} 
                                minSize={isOrdersCollapsed ? 8 : 15} 
                                maxSize={50}
                                key={`orders-${isOrdersCollapsed ? 'collapsed' : 'expanded'}`}
                            >
                                <div className="h-full bg-gray-50 border border-gray-200 rounded p-4">
                                    <ChartNav/>
                                    <Orders/>
                                </div>
                            </ResizablePanel>
                        </ResizablePanelGroup>
                    </div>
                </ResizablePanel>
                <ResizableHandle />
                <ResizablePanel defaultSize={25} minSize={10} maxSize={40} className="bg-gray-100 ">
                    <div className="p-4">Navbar / Sidebar</div>
                </ResizablePanel>
            </ResizablePanelGroup>
        </div>
    )
}

export default function Desk() {
    return (
        <OrdersProvider>
            <DeskContent />
        </OrdersProvider>
    )
}

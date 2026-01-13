'use client';
import MainChart from '@/components/desk/Chart';
import ChartNav from '@/components/desk/Chart-nav';
import LiveMarket from '@/components/desk/Livemarket';
import OrderBook from '@/components/desk/OrderBook';
import Orders from '@/components/desk/Orders';
import { OrdersProvider, useOrders } from '@/components/desk/OrdersContext';
import { TradingProvider } from '@/components/desk/TradingContext';
import { WalletProvider } from '@/components/desk/WalletContext';
import PriceCard from '@/components/desk/PriceBoard';
import WalletMenu from '@/components/desk/Wallet';
import {
  ResizablePanel,
  ResizableHandle,
  ResizablePanelGroup,
  ResizableHandleVerticle,
} from '@/components/ui/resizable';

function DeskContent() {
  const { isOrdersCollapsed } = useOrders();

  // Adjust panel sizes based on orders drawer state
  // When collapsed, we only need space for the orders header bar (~48px)
  const chartSize = isOrdersCollapsed ? 92 : 70;
  const ordersSize = isOrdersCollapsed ? 8 : 30;

  return (
    <div className="fixed inset-0 overflow-hidden">
      <ResizablePanelGroup direction="horizontal" className="h-full w-full">
        <ResizablePanel defaultSize={80} className="">
          <div className="p-4 h-full">
            <ResizablePanelGroup direction="vertical" className="h-full">
              <ResizablePanel
                defaultSize={chartSize}
                minSize={30}
                key={`chart-${isOrdersCollapsed ? 'collapsed' : 'expanded'}`}
              >
                <div className="h-full">
                  <MainChart />
                </div>
              </ResizablePanel>
              <div className="m-2"></div>
              <ResizableHandle />
              <ResizablePanel
                defaultSize={ordersSize}
                minSize={isOrdersCollapsed ? 16 : 20}
                maxSize={50}
                key={`orders-${isOrdersCollapsed ? 'collapsed' : 'expanded'}`}
              >
                <ChartNav />
                <Orders />
              </ResizablePanel>
            </ResizablePanelGroup>
          </div>
        </ResizablePanel>
        <ResizableHandleVerticle />
        <ResizablePanel defaultSize={25} minSize={10} maxSize={40} className="bg-background">
          <div className="h-full overflow-y-auto">
            <div className="p-4 ">
              <WalletMenu />
            </div>
            <div>
              <LiveMarket />
            </div>
            <div>
              <PriceCard />
            </div>
            <div className="">
              <OrderBook />
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}

export default function Desk() {
  return (
    <TradingProvider>
      <WalletProvider>
        <OrdersProvider>
          <DeskContent />
        </OrdersProvider>
      </WalletProvider>
    </TradingProvider>
  );
}

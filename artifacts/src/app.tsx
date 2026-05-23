import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import Incidents from "@/pages/incidents";
import IncidentDetail from "@/pages/incident-detail";
import Topology from "@/pages/topology";
import Logs from "@/pages/logs";
import Chat from "@/pages/chat";
import Replay from "@/pages/replay";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5000,
    },
  },
});

function Router() {
  return (
    <Layout>
      <AlertToasts />
      <Switch>
        <Route path="/" component={Landing} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/incidents" component={Incidents} />
        <Route path="/incidents/:id" component={IncidentDetail} />
        <Route path="/topology" component={Topology} />
        <Route path="/logs" component={Logs} />
        <Route path="/chat" component={Chat} />
        <Route path="/replay/:id" component={Replay} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

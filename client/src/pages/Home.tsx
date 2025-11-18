import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Zap, Network, Brain } from "lucide-react";
import { APP_LOGO, APP_TITLE } from "@/const";
import { Link } from "wouter";

export default function Home() {
  return (
      <div className="min-h-screen bg-gradient-to-br from-white to-slate-50 text-slate-900">
        <nav className="border-b border-slate-200 bg-white/80 backdrop-blur">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {APP_LOGO && <img src={APP_LOGO} alt="Logo" className="h-8 w-8" />}
              <span className="text-xl font-bold">{APP_TITLE}</span>
            </div>
            <Link href="/research">
              <Button className="bg-blue-600 hover:bg-blue-700">Open Research</Button>
            </Link>
          </div>
        </nav>

        <section className="container mx-auto px-4 py-20">
          <div className="max-w-3xl">
            <h1 className="text-5xl font-bold mb-6 leading-tight">
              Multi-Agent AI for Legal Research
            </h1>
            <p className="text-xl text-slate-600 mb-8">
              Experience cutting-edge agentic AI in action. Watch as specialized agents collaborate to research complex legal cases with unprecedented accuracy and transparency.
            </p>
            <Link href="/research">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-lg">
                Get Started <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </section>

        <section className="container mx-auto px-4 py-16">
          <h2 className="text-3xl font-bold mb-12 text-center">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="bg-white border-slate-200">
              <CardHeader>
                <Brain className="h-8 w-8 text-blue-600 mb-2" />
                <CardTitle>Multi-Agent Coordination</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600">
                  Three specialized agents (Lawyer, Associate, Researcher) work together seamlessly, each with distinct roles and expertise.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200">
              <CardHeader>
                <Network className="h-8 w-8 text-green-600 mb-2" />
                <CardTitle>Real-Time Visualization</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600">
                  Watch live node-based workflow diagrams showing which agent is active and what they are doing in real-time.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200">
              <CardHeader>
                <Zap className="h-8 w-8 text-yellow-600 mb-2" />
                <CardTitle>Agent-to-Agent (A2A) Protocol</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600">
                  Structured inter-agent messaging enables coordination, data handoff, and accountability between agents.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="container mx-auto px-4 py-16 text-center">
          <h2 className="text-3xl font-bold mb-6 text-slate-900">Ready to Experience Agentic AI?</h2>
          <p className="text-slate-600 mb-8 max-w-2xl mx-auto">
            Submit a legal case query and watch our multi-agent system research it in real-time.
          </p>
          <Link href="/research">
            <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
              Start Now
            </Button>
          </Link>
        </section>
      </div>
    );
}

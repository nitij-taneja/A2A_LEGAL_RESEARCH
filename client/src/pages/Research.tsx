import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, Clock, Play } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";

export default function Research() {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [query, setQuery] = useState("");
  const [selectedCaseId, setSelectedCaseId] = useState<number | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  const createCaseMutation = trpc.cases.create.useMutation();
  const executeCaseMutation = trpc.cases.execute.useMutation();
  const casesQuery = trpc.cases.list.useQuery();
  const agentLogsQuery = trpc.agentLogs.getByCaseId.useQuery(
    { caseId: selectedCaseId || 0 },
    { enabled: !!selectedCaseId }
  );
  const resultsQuery = trpc.results.getByCaseId.useQuery(
    { caseId: selectedCaseId || 0 },
    { enabled: !!selectedCaseId }
  );

  const handleCreateCase = async () => {
    if (!title.trim() || !query.trim()) {
      alert("Please fill in title and query");
      return;
    }

    try {
      const result = await createCaseMutation.mutateAsync({
        title,
        description: description || null,
        query,
      });
      setSelectedCaseId(result.caseId);
      setTitle("");
      setDescription("");
      setQuery("");
    } catch (error) {
      console.error("Failed to create case:", error);
      alert("Failed to create case");
    }
  };

  const handleExecuteCase = async () => {
    if (!selectedCaseId) return;

    setIsExecuting(true);
    try {
      await executeCaseMutation.mutateAsync({ caseId: selectedCaseId });
      // Refetch logs and results
      await agentLogsQuery.refetch();
      await resultsQuery.refetch();
    } catch (error) {
      console.error("Failed to execute case:", error);
      alert("Failed to execute case");
    } finally {
      setIsExecuting(false);
    }
  };

  const logs = agentLogsQuery.data || [];
  const result = resultsQuery.data;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Navigation */}
      <nav className="border-b border-slate-200 bg-white">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-slate-900 hover:text-blue-600">
            Agentic Legal Research
          </Link>
          <span className="text-sm text-slate-600">Welcome, {user?.name}</span>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Panel: Input Form */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>New Case</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Case Title
                  </label>
                  <Input
                    placeholder="e.g., Smith v. Jones - Contract Dispute"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Description (Optional)
                  </label>
                  <Textarea
                    placeholder="Provide additional context..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Legal Query
                  </label>
                  <Textarea
                    placeholder="What legal question do you need researched?"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    rows={4}
                  />
                </div>

                <Button
                  onClick={handleCreateCase}
                  disabled={createCaseMutation.isPending}
                  className="w-full"
                >
                  {createCaseMutation.isPending ? "Creating..." : "Create Case"}
                </Button>
              </CardContent>
            </Card>

            {/* Cases List */}
            {casesQuery.data && casesQuery.data.length > 0 && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="text-lg">Your Cases</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {casesQuery.data.map((caseItem) => (
                    <button
                      key={caseItem.id}
                      onClick={() => setSelectedCaseId(caseItem.id)}
                      className={`w-full p-3 text-left rounded border transition ${
                        selectedCaseId === caseItem.id
                          ? "border-blue-500 bg-blue-50"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div className="font-medium text-sm">{caseItem.title}</div>
                      <div className="text-xs text-slate-500 mt-1">
                        Status: <Badge variant="outline">{caseItem.status}</Badge>
                      </div>
                    </button>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Panel: Visualization & Results */}
          <div className="lg:col-span-2 space-y-6">
            {selectedCaseId && (
              <>
                {/* Execution Button */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>Agent Workflow</span>
                      <Button
                        onClick={handleExecuteCase}
                        disabled={isExecuting || executeCaseMutation.isPending}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Play className="h-4 w-4 mr-2" />
                        {isExecuting || executeCaseMutation.isPending
                          ? "Executing..."
                          : "Execute"}
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {/* Node-Based Workflow Visualization */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-slate-50 rounded border border-slate-200">
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                          <span className="font-medium">Lawyer Agent</span>
                        </div>
                        <Badge>Coordinator</Badge>
                      </div>

                      <div className="flex justify-center">
                        <div className="w-1 h-8 bg-slate-300"></div>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-slate-50 rounded border border-slate-200">
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          <span className="font-medium">Web Researcher Agent</span>
                        </div>
                        <Badge variant="secondary">Executor</Badge>
                      </div>

                      <div className="flex justify-center">
                        <div className="w-1 h-8 bg-slate-300"></div>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-slate-50 rounded border border-slate-200">
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                          <span className="font-medium">Research Associate Agent</span>
                        </div>
                        <Badge variant="secondary">Synthesizer</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Execution Logs */}
                {logs.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Execution Trace</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {logs.map((log, idx) => (
                          <div
                            key={idx}
                            className="p-3 bg-slate-50 rounded border border-slate-200 text-sm"
                          >
                            <div className="flex items-start gap-2">
                              {log.action === "completed" ? (
                                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                              ) : log.action === "failed" ? (
                                <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                              ) : (
                                <Clock className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                              )}
                              <div className="flex-1">
                                <div className="font-medium">
                                  {log.agentName} - {log.action}
                                </div>
                                {log.input && (
                                  <div className="text-xs text-slate-600 mt-1">
                                    Input: {log.input.substring(0, 100)}
                                    {log.input.length > 100 ? "..." : ""}
                                  </div>
                                )}
                                {log.reasoning && (
                                  <div className="text-xs text-slate-600 mt-1">
                                    Reasoning: {log.reasoning}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Results */}
                {result && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Research Results</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {result.summary && (
                        <div>
                          <h4 className="font-medium text-slate-900 mb-2">Summary</h4>
                          <p className="text-sm text-slate-700">{result.summary}</p>
                        </div>
                      )}

                      {result.recommendation && (
                        <div>
                          <h4 className="font-medium text-slate-900 mb-2">Recommendation</h4>
                          <p className="text-sm text-slate-700">{result.recommendation}</p>
                        </div>
                      )}

                      {result.findings && (
                        <div>
                          <h4 className="font-medium text-slate-900 mb-2">Detailed Findings</h4>
                          <pre className="text-xs bg-slate-50 p-3 rounded overflow-auto max-h-48">
                            {JSON.stringify(JSON.parse(result.findings), null, 2)}
                          </pre>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </>
            )}

            {!selectedCaseId && (
              <Card>
                <CardContent className="pt-6 text-center text-slate-500">
                  <p>Create a new case or select an existing one to begin</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { orpc } from '@/orpc/client'

export const Route = createFileRoute('/')({
	component: TodoApp,
})

function TodoApp() {
	const [newTodoName, setNewTodoName] = useState('')
	const queryClient = useQueryClient()

	// Using oRPC TanStack Query integration - queryOptions
	const todosQuery = useQuery(
		orpc.listTodos.queryOptions({
			input: {},
		}),
	)

	// Using oRPC TanStack Query integration - mutationOptions
	const addTodoMutation = useMutation(
		orpc.addTodo.mutationOptions({
			onSuccess: () => {
				// Using oRPC key generation for invalidation
				queryClient.invalidateQueries({
					queryKey: orpc.listTodos.key(),
				})
				setNewTodoName('')
			},
		}),
	)

	const handleAddTodo = (e: React.FormEvent) => {
		e.preventDefault()
		if (newTodoName.trim()) {
			addTodoMutation.mutate({ name: newTodoName.trim() })
		}
	}

	return (
		<div className="min-h-screen bg-gray-50 py-8">
			<div className="max-w-2xl mx-auto px-4">
				<h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
					oRPC + TanStack Query Demo
				</h1>

				<div className="bg-white rounded-lg shadow-md p-6 mb-6">
					<form onSubmit={handleAddTodo} className="flex gap-2">
						<input
							type="text"
							value={newTodoName}
							onChange={(e) => setNewTodoName(e.target.value)}
							placeholder="Add a new todo..."
							className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
							disabled={addTodoMutation.isPending}
						/>
						<button
							type="submit"
							disabled={addTodoMutation.isPending || !newTodoName.trim()}
							className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
						>
							{addTodoMutation.isPending ? 'Adding...' : 'Add Todo'}
						</button>
					</form>
				</div>

				<div className="bg-white rounded-lg shadow-md">
					{todosQuery.isLoading && (
						<div className="p-6 text-center text-gray-500">Loading todos...</div>
					)}

					{todosQuery.isError && (
						<div className="p-6 text-center text-red-500">
							Error: {todosQuery.error?.message}
						</div>
					)}

					{todosQuery.data && (
						<div className="divide-y divide-gray-200">
							{todosQuery.data.map((todo) => (
								<div key={todo.id} className="p-4 hover:bg-gray-50">
									<div className="flex justify-between items-center">
										<span className="text-gray-900">{todo.name}</span>
										<span className="text-sm text-gray-500">ID: {todo.id}</span>
									</div>
								</div>
							))}
						</div>
					)}
				</div>

				<div className="mt-8 p-4 bg-blue-50 rounded-lg">
					<h2 className="text-lg font-semibold text-blue-900 mb-2">
						oRPC TanStack Query Features Used:
					</h2>
					<ul className="text-sm text-blue-800 space-y-1">
						<li>• <code>orpc.listTodos.queryOptions()</code> - Query configuration</li>
						<li>• <code>orpc.addTodo.mutationOptions()</code> - Mutation configuration</li>
						<li>• <code>orpc.listTodos.key()</code> - Key generation for invalidation</li>
					</ul>
				</div>
			</div>
		</div>
	)
}

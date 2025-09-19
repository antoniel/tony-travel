# Componentes de Interface (UI Components)

## Visão Geral

O Tony Travel utiliza um sistema robusto de componentes baseado em **Shadcn UI** com **Tailwind CSS**, fornecendo uma biblioteca completa de componentes reutilizáveis e estilizados para construir interfaces de viagem modernas e funcionais.

## Arquitetura de Componentes

### Estrutura Base

```
src/components/
├── ui/                    # Componentes base do Shadcn UI
├── guards/               # Componentes de proteção de rotas
├── members/              # Componentes de gerenciamento de membros
├── ai-elements/          # Componentes de IA e chat
└── [feature]/            # Componentes específicos de funcionalidades
```

### Configuração Shadcn UI

O projeto está configurado com o estilo **"new-york"** do Shadcn UI:

```json
{
  "style": "new-york",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "baseColor": "zinc",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui"
  }
}
```

## Componentes UI Base

### Componentes de Layout

#### Card
```tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

<Card>
  <CardHeader>
    <CardTitle>Título da Viagem</CardTitle>
    <CardDescription>Descrição da experiência</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Conteúdo do card */}
  </CardContent>
</Card>
```

#### Button
Componente de botão com múltiplas variantes e tamanhos:

```tsx
import { Button } from "@/components/ui/button"

// Variantes disponíveis
<Button variant="default">Primário</Button>
<Button variant="destructive">Destrutivo</Button>
<Button variant="outline">Outline</Button>
<Button variant="secondary">Secundário</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="link">Link</Button>

// Tamanhos disponíveis
<Button size="sm">Pequeno</Button>
<Button size="default">Padrão</Button>
<Button size="lg">Grande</Button>
<Button size="icon">Ícone</Button>
```

### Componentes de Entrada

#### Form
Sistema completo de formulários com validação Zod:

```tsx
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

const form = useForm({
  resolver: zodResolver(schema),
})

<Form {...form}>
  <FormField
    control={form.control}
    name="fieldName"
    render={({ field }) => (
      <FormItem>
        <FormLabel>Label</FormLabel>
        <FormControl>
          <Input placeholder="Digite aqui..." {...field} />
        </FormControl>
        <FormMessage />
      </FormItem>
    )}
  />
</Form>
```

#### Input Personalizado
```tsx
import { Input } from "@/components/ui/input"

<Input 
  type="text" 
  placeholder="Nome da viagem..."
  className="focus-visible:ring-primary/50"
/>
```

### Componentes de Navegação

#### Tabs
```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

<Tabs defaultValue="overview">
  <TabsList>
    <TabsTrigger value="overview">Visão Geral</TabsTrigger>
    <TabsTrigger value="itinerary">Itinerário</TabsTrigger>
    <TabsTrigger value="members">Membros</TabsTrigger>
  </TabsList>
  <TabsContent value="overview">
    {/* Conteúdo da aba */}
  </TabsContent>
</Tabs>
```

#### Breadcrumb
```tsx
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator } from "@/components/ui/breadcrumb"

<Breadcrumb>
  <BreadcrumbList>
    <BreadcrumbItem>
      <BreadcrumbLink href="/">Home</BreadcrumbLink>
    </BreadcrumbItem>
    <BreadcrumbSeparator />
    <BreadcrumbItem>
      <BreadcrumbLink href="/trip">Viagens</BreadcrumbLink>
    </BreadcrumbItem>
  </BreadcrumbList>
</Breadcrumb>
```

### Componentes de Feedback

#### Alert
```tsx
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { InfoIcon } from "lucide-react"

<Alert>
  <InfoIcon className="h-4 w-4" />
  <AlertTitle>Informação!</AlertTitle>
  <AlertDescription>
    Sua viagem foi salva com sucesso.
  </AlertDescription>
</Alert>
```

#### Toast (Sonner)
```tsx
import { toast } from "sonner"

// Notificações
toast.success("Viagem criada com sucesso!")
toast.error("Erro ao salvar viagem")
toast.info("Dados atualizados")
```

### Componentes de Exibição

#### Badge
```tsx
import { Badge } from "@/components/ui/badge"

<Badge variant="default">Ativo</Badge>
<Badge variant="secondary">Rascunho</Badge>
<Badge variant="destructive">Cancelado</Badge>
<Badge variant="outline">Pendente</Badge>
```

#### Avatar
```tsx
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

<Avatar>
  <AvatarImage src="/avatar.jpg" alt="@usuario" />
  <AvatarFallback>UN</AvatarFallback>
</Avatar>
```

## Componentes Especializados

### Componentes de Proteção (Guards)

#### GuardLoggedIn
```tsx
import { GuardLoggedIn } from "@/components/guards/GuardLoggedIn"

<GuardLoggedIn>
  {/* Conteúdo apenas para usuários logados */}
</GuardLoggedIn>
```

#### TravelMemberOnly
```tsx
import { TravelMemberOnly } from "@/components/guards/TravelMemberOnly"

<TravelMemberOnly travelId={travelId}>
  {/* Conteúdo apenas para membros da viagem */}
</TravelMemberOnly>
```

### Componentes de IA

#### Conversation
Sistema de chat com IA integrada:

```tsx
import { Conversation, ConversationContent } from "@/components/ai-elements/conversation"

<Conversation>
  <ConversationContent>
    {/* Mensagens do chat */}
  </ConversationContent>
</Conversation>
```

#### Message
```tsx
import { Message } from "@/components/ai-elements/message"

<Message 
  role="assistant"
  content="Como posso ajudar com sua viagem?"
/>
```

### Componentes de Viagem

#### TripWizard
Assistente de criação de viagens:

```tsx
import { TripWizard } from "@/components/TripWizard"

<TripWizard 
  onTripCreated={(trip) => {
    // Lógica após criação
  }}
/>
```

#### TravelTimeline
Exibição de cronograma da viagem:

```tsx
import { TravelTimeline } from "@/components/TravelTimeline"

<TravelTimeline 
  events={events}
  travelId={travelId}
/>
```

## Padrões de Composição

### Decomposição de Componentes

Seguindo as melhores práticas, evite usar comentários para organizar seções JSX. Em vez disso, decomponha em componentes menores:

```tsx
// ❌ Evite
function TripPage() {
  return (
    <div>
      {/* Header Section */}
      <div className="header">...</div>
      
      {/* Stats Section */}
      <div className="stats">...</div>
      
      {/* Content Section */}
      <div className="content">...</div>
    </div>
  )
}

// ✅ Prefira
function TripPage() {
  return (
    <div>
      <TripHeader />
      <TripStats />
      <TripContent />
    </div>
  )
}

function TripHeader() {
  return <div className="header">...</div>
}

function TripStats() {
  return <div className="stats">...</div>
}

function TripContent() {
  return <div className="content">...</div>
}
```

### Colocalização de Estado

Mova o estado para o nível mais baixo possível onde é necessário:

```tsx
// ✅ Estado local no componente que o utiliza
function TripHeader() {
  const [isEditing, setIsEditing] = useState(false)
  
  return (
    <div>
      {isEditing ? <EditForm /> : <DisplayInfo />}
      <Button onClick={() => setIsEditing(!isEditing)}>
        {isEditing ? 'Salvar' : 'Editar'}
      </Button>
    </div>
  )
}
```

### Composição de Props

Use spreads para passar props de forma flexível:

```tsx
interface CardProps extends ComponentProps<"div"> {
  title: string
  description?: string
}

function CustomCard({ title, description, className, ...props }: CardProps) {
  return (
    <Card className={cn("custom-styles", className)} {...props}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
    </Card>
  )
}
```

## Utilitários e Helpers

### clsx & tailwind-merge
```tsx
import { cn } from "@/lib/utils"

// Combina classes condicionalmente
const className = cn(
  "base-class",
  {
    "active-class": isActive,
    "disabled-class": isDisabled,
  },
  additionalClassName
)
```

### Class Variance Authority (CVA)
Para componentes com múltiplas variantes:

```tsx
import { cva, type VariantProps } from "class-variance-authority"

const cardVariants = cva(
  "rounded-lg border bg-card text-card-foreground",
  {
    variants: {
      variant: {
        default: "border-border",
        elevated: "shadow-lg",
        outline: "border-2",
      },
      size: {
        sm: "p-4",
        md: "p-6",
        lg: "p-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
)

interface CardProps extends VariantProps<typeof cardVariants> {
  className?: string
}
```

## Acessibilidade

### Práticas Implementadas

1. **Foco visível**: Todos os componentes interativos têm estados de foco claros
2. **ARIA labels**: Componentes complexos incluem labels apropriados
3. **Navegação por teclado**: Suporte completo para navegação sem mouse
4. **Contraste**: Cores seguem diretrizes WCAG

### Exemplo de Implementação

```tsx
<Button
  aria-label="Adicionar nova viagem"
  aria-describedby="trip-help-text"
  className="focus-visible:ring-2 focus-visible:ring-primary"
>
  Adicionar Viagem
</Button>
<span id="trip-help-text" className="sr-only">
  Cria uma nova viagem no seu painel
</span>
```

## Performance

### Lazy Loading
```tsx
import { lazy, Suspense } from "react"

const TripWizard = lazy(() => import("@/components/TripWizard"))

function CreateTripPage() {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <TripWizard />
    </Suspense>
  )
}
```

### Memoização
```tsx
import { memo } from "react"

const TripCard = memo(function TripCard({ trip, onSelect }) {
  return (
    <Card onClick={() => onSelect(trip.id)}>
      {/* Conteúdo do card */}
    </Card>
  )
})
```

## Testes

### Componentes de Teste

```tsx
import { render, screen } from "@testing-library/react"
import { Button } from "@/components/ui/button"

test("renderiza botão com texto", () => {
  render(<Button>Clique aqui</Button>)
  expect(screen.getByRole("button", { name: "Clique aqui" })).toBeInTheDocument()
})
```

### Wrapper de Testes

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

function TestWrapper({ children }) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
```

## Boas Práticas

### 1. Nomenclatura Consistente
- Use PascalCase para componentes
- Use camelCase para props e funções
- Use kebab-case para classes CSS personalizadas

### 2. Tipagem TypeScript
```tsx
interface ComponentProps {
  title: string
  description?: string
  onAction: (id: string) => void
  variant?: "default" | "primary" | "secondary"
}
```

### 3. Props Interface Extensão
```tsx
interface ButtonProps extends ComponentProps<"button"> {
  variant?: "primary" | "secondary"
  loading?: boolean
}
```

### 4. Defaults e Fallbacks
```tsx
function Component({ 
  title = "Título padrão",
  variant = "default",
  ...props 
}) {
  return <div {...props}>{title}</div>
}
```

### 5. Documentação inline
```tsx
/**
 * Componente para exibir informações de uma viagem
 * @param trip - Dados da viagem
 * @param onEdit - Callback para edição
 * @param variant - Estilo visual do componente
 */
function TripCard({ trip, onEdit, variant = "default" }) {
  // implementação
}
```

O sistema de componentes do Tony Travel oferece uma base sólida e escalável para construir interfaces de viagem intuitivas e funcionais, seguindo as melhores práticas do ecossistema React moderno.
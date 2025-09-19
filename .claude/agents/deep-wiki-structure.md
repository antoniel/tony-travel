---
name: deep-wiki-structure
description: This agent is responsible for create the structure of the wiki
model: sonnet
---

Analyze this GitHub repository ${owner}/${repo} and create a wiki structure for it.

1. The complete file tree of the project:
   <file_tree>
   ${fileTree}
   </file_tree>

2. The README file of the project:
   <readme>
   ${readme}
   </readme>

I want to create a wiki for this repository. Determine the most logical structure for a wiki based on the repository's content.

IMPORTANT: The wiki content will be generated in Brazilian Portuguese (Português Brasileiro)

When designing the wiki structure, include pages that would benefit from visual diagrams, such as:

- Architecture overviews
- Data flow descriptions
- Component relationships
- Process workflows
- State machines
- Class hierarchies

Create a structured wiki with the following main sections:

- Overview (general information about the project)
- System Architecture (how the system is designed)
- Core Features (key functionality)
- Data Management/Flow: If applicable, how data is stored, processed, accessed, and managed (e.g., database schema, data pipelines, state management).
- Frontend Components (UI elements, if applicable.)
- Backend Systems (server-side components)
- Model Integration (AI model connections)
- Deployment/Infrastructure (how to deploy, what's the infrastructure like)
- Extensibility and Customization: If the project architecture supports it, explain how to extend or customize its functionality (e.g., plugins, theming, custom modules, hooks).

Each section should contain relevant pages. For example, the "Frontend Components" section might include pages for "Home Page", "Repository Wiki Page", "Ask Component", etc.

Return your analysis in the following XML format:

<wiki_structure>

  <title>[Overall title for the wiki]</title>
  <description>[Brief description of the repository]</description>
  <sections>
    <section id="section-1">
      <title>[Section title]</title>
      <pages>
        <page_ref>page-1</page_ref>
        <page_ref>page-2</page_ref>
      </pages>
      <subsections>
        <section_ref>section-2</section_ref>
      </subsections>
    </section>
    <!-- More sections as needed -->
  </sections>
  <pages>
    <page id="page-1">
      <title>[Page title]</title>
      <description>[Brief description of what this page will cover]</description>
      <importance>high|medium|low</importance>
      <relevant_files>
        <file_path>[Path to a relevant file]</file_path>
        <!-- More file paths as needed -->
      </relevant_files>
      <related_pages>
        <related>page-2</related>
        <!-- More related page IDs as needed -->
      </related_pages>
      <parent_section>section-1</parent_section>
    </page>
    <!-- More pages as needed -->
  </pages>
</wiki_structure>
` : `
Return your analysis in the following XML format:

<wiki_structure>

  <title>[Overall title for the wiki]</title>
  <description>[Brief description of the repository]</description>
  <pages>
    <page id="page-1">
      <title>[Page title]</title>
      <description>[Brief description of what this page will cover]</description>
      <importance>high|medium|low</importance>
      <relevant_files>
        <file_path>[Path to a relevant file]</file_path>
        <!-- More file paths as needed -->
      </relevant_files>
      <related_pages>
        <related>page-2</related>
        <!-- More related page IDs as needed -->
      </related_pages>
    </page>
    <!-- More pages as needed -->
  </pages>
</wiki_structure>
`}

IMPORTANT FORMATTING INSTRUCTIONS:

- Return ONLY the valid XML structure specified above
- DO NOT wrap the XML in markdown code blocks (no \`\`\` or \`\`\`xml)
- DO NOT include any explanation text before or after the XML
- Ensure the XML is properly formatted and valid
- Start directly with <wiki_structure> and end with </wiki_structure>

IMPORTANT:

1. Create '8-12' pages that would make a ${isComprehensiveView ? 'comprehensive' : 'concise'} wiki for this repository
2. Each page should focus on a specific aspect of the codebase (e.g., architecture, key features, setup)
3. The relevant_files should be actual files from the repository that would be used to generate that page
4. Return ONLY valid XML with the structure specified above, with no markdown code block delimiters

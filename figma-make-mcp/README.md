# Figma Make MCP Server

MCP server for integrating Figma Make prototypes into Claude Code development workflow.

## Features

- **Get Figma File Data**: Extract file structure, pages, and components
- **Prototype Analysis**: Pull interaction flows and prototype connections
- **Design Token Extraction**: Auto-extract colors, typography, and spacing
- **Component Specifications**: Get detailed specs for implementation

## Setup

1. **Install Dependencies**
```bash
cd figma-make-mcp
npm install
```

2. **Configure Environment**
```bash
cp .env.example .env
# Add your Figma personal access token to .env
```

3. **Get Figma Personal Access Token**
- Go to [Figma Settings > Personal Access Tokens](https://www.figma.com/settings)
- Generate a new token
- Add it to your `.env` file

4. **Build and Test**
```bash
npm run build
npm start
```

## Usage with Claude Code

1. **Add MCP Server**
```bash
claude mcp add figma-make ./figma-make-mcp
```

2. **Use Tools**
- `get_figma_file`: Get basic file information
- `get_prototype_data`: Extract prototype interactions
- `extract_design_tokens`: Pull design system tokens
- `get_component_specs`: Get implementation specifications

## Figma URL Format

From Figma URLs like:
`https://www.figma.com/file/ABC123DEF456/My-Design`

Use file key: `ABC123DEF456`

## Example Workflow

1. **Create prototype in Figma Make**
2. **Get file key from URL**
3. **Use MCP tools to extract specs**:
   ```
   get_figma_file file_key="ABC123"
   get_prototype_data file_key="ABC123"
   extract_design_tokens file_key="ABC123"
   ```
4. **Claude Code implements the design**

This creates a seamless design-to-code pipeline!
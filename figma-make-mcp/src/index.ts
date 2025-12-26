#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

class FigmaMakeServer {
  private server: Server;
  private figmaToken: string;

  constructor() {
    this.figmaToken = process.env.FIGMA_TOKEN || '';
    
    this.server = new Server(
      {
        name: 'figma-make-mcp-server',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    this.setupErrorHandling();
  }

  private setupErrorHandling(): void {
    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupToolHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'get_figma_file',
          description: 'Get Figma file data including frames, components, and basic structure',
          inputSchema: {
            type: 'object',
            properties: {
              file_key: {
                type: 'string',
                description: 'The Figma file key from the URL',
              },
            },
            required: ['file_key'],
          },
        },
        {
          name: 'get_prototype_data',
          description: 'Get prototype interaction data and flows from a Figma file',
          inputSchema: {
            type: 'object',
            properties: {
              file_key: {
                type: 'string',
                description: 'The Figma file key from the URL',
              },
              node_ids: {
                type: 'array',
                items: { type: 'string' },
                description: 'Optional: Specific node IDs to analyze',
              },
            },
            required: ['file_key'],
          },
        },
        {
          name: 'extract_design_tokens',
          description: 'Extract design tokens (colors, typography, spacing) from a Figma file',
          inputSchema: {
            type: 'object',
            properties: {
              file_key: {
                type: 'string',
                description: 'The Figma file key from the URL',
              },
            },
            required: ['file_key'],
          },
        },
        {
          name: 'get_component_specs',
          description: 'Get detailed component specifications for implementation',
          inputSchema: {
            type: 'object',
            properties: {
              file_key: {
                type: 'string',
                description: 'The Figma file key from the URL',
              },
              component_name: {
                type: 'string',
                description: 'Name of the component to analyze',
              },
            },
            required: ['file_key', 'component_name'],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      if (!args) {
        throw new Error('Missing arguments');
      }

      try {
        switch (name) {
          case 'get_figma_file':
            return await this.getFigmaFile(args.file_key as string);
          
          case 'get_prototype_data':
            return await this.getPrototypeData(
              args.file_key as string,
              args.node_ids as string[]
            );
          
          case 'extract_design_tokens':
            return await this.extractDesignTokens(args.file_key as string);
          
          case 'get_component_specs':
            return await this.getComponentSpecs(
              args.file_key as string,
              args.component_name as string
            );
          
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  private async makeApiRequest(endpoint: string): Promise<any> {
    if (!this.figmaToken) {
      throw new Error('FIGMA_TOKEN environment variable is required');
    }

    const response = await fetch(`https://api.figma.com/v1/${endpoint}`, {
      headers: {
        'X-Figma-Token': this.figmaToken,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Figma API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return response.json();
  }

  private async makeFigmaMakeRequest(fileKey: string): Promise<any> {
    if (!this.figmaToken) {
      throw new Error('FIGMA_TOKEN environment variable is required');
    }

    // Try different endpoints for Figma Make
    const endpoints = [
      `files/${fileKey}`,
      `files/${fileKey}/nodes`,
      `files/${fileKey}/prototypes`,
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(`https://api.figma.com/v1/${endpoint}`, {
          headers: {
            'X-Figma-Token': this.figmaToken,
          },
        });

        if (response.ok) {
          return await response.json();
        }
      } catch (error) {
        // Continue to next endpoint
        continue;
      }
    }

    throw new Error('Unable to access Figma Make prototype data through available endpoints');
  }

  private async getFigmaFile(fileKey: string) {
    try {
      // First try regular Figma API
      const data = await this.makeApiRequest(`files/${fileKey}`);
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              fileType: 'Regular Figma File',
              name: data.name,
              lastModified: data.lastModified,
              thumbnailUrl: data.thumbnailUrl,
              version: data.version,
              pages: data.document.children.map((page: any) => ({
                id: page.id,
                name: page.name,
                type: page.type,
                children: page.children?.length || 0,
              })),
              components: Object.keys(data.components || {}).length,
              styles: Object.keys(data.styles || {}).length,
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      // If regular API fails, try Figma Make endpoints
      try {
        const makeData = await this.makeFigmaMakeRequest(fileKey);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                fileType: 'Figma Make Prototype',
                fileKey: fileKey,
                rawData: makeData,
                message: 'Successfully accessed Figma Make prototype data',
              }, null, 2),
            },
          ],
        };
      } catch (makeError) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: 'Failed to access both regular Figma file and Figma Make prototype',
                originalError: error instanceof Error ? error.message : 'Unknown error',
                makeError: makeError instanceof Error ? makeError.message : 'Unknown error',
                fileKey: fileKey,
                suggestion: 'This might be a Figma Make prototype that requires different API access or permissions',
              }, null, 2),
            },
          ],
        };
      }
    }
  }

  private async getPrototypeData(fileKey: string, nodeIds?: string[]) {
    const data = await this.makeApiRequest(`files/${fileKey}`);
    const prototypeData = this.extractPrototypeInteractions(data.document);
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(prototypeData, null, 2),
        },
      ],
    };
  }

  private extractPrototypeInteractions(node: any): any {
    const interactions: any[] = [];
    
    const traverse = (current: any) => {
      if (current.transitionNodeID) {
        interactions.push({
          id: current.id,
          name: current.name,
          type: current.type,
          transition: {
            nodeId: current.transitionNodeID,
            type: current.transitionType || 'unknown',
            trigger: current.transitionTrigger || 'unknown',
          },
        });
      }
      
      if (current.children) {
        current.children.forEach(traverse);
      }
    };
    
    traverse(node);
    
    return {
      totalInteractions: interactions.length,
      interactions: interactions,
    };
  }

  private async extractDesignTokens(fileKey: string) {
    const data = await this.makeApiRequest(`files/${fileKey}`);
    const tokens = this.parseDesignTokens(data.document);
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(tokens, null, 2),
        },
      ],
    };
  }

  private parseDesignTokens(document: any): any {
    const tokens = {
      colors: new Set<string>(),
      fonts: new Set<string>(),
      fontSizes: new Set<number>(),
      spacing: new Set<number>(),
    };

    const traverse = (node: any) => {
      if (node.fills) {
        node.fills.forEach((fill: any) => {
          if (fill.type === 'SOLID' && fill.color) {
            const { r, g, b, a = 1 } = fill.color;
            const rgba = `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${a})`;
            tokens.colors.add(rgba);
          }
        });
      }

      if (node.style) {
        if (node.style.fontFamily) tokens.fonts.add(node.style.fontFamily);
        if (node.style.fontSize) tokens.fontSizes.add(node.style.fontSize);
      }

      if (node.children) {
        node.children.forEach(traverse);
      }
    };

    traverse(document);

    return {
      colors: Array.from(tokens.colors),
      fonts: Array.from(tokens.fonts),
      fontSizes: Array.from(tokens.fontSizes).sort((a, b) => a - b),
      spacing: Array.from(tokens.spacing).sort((a, b) => a - b),
    };
  }

  private async getComponentSpecs(fileKey: string, componentName: string) {
    const data = await this.makeApiRequest(`files/${fileKey}`);
    const component = this.findComponentByName(data.document, componentName);
    
    if (!component) {
      throw new Error(`Component "${componentName}" not found`);
    }

    const specs = this.generateComponentSpecs(component);
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(specs, null, 2),
        },
      ],
    };
  }

  private findComponentByName(document: any, name: string): any {
    let found: any = null;

    const traverse = (node: any) => {
      if (node.name === name && node.type === 'COMPONENT') {
        found = node;
        return;
      }
      if (node.children && !found) {
        node.children.forEach(traverse);
      }
    };

    traverse(document);
    return found;
  }

  private generateComponentSpecs(component: any): any {
    return {
      name: component.name,
      type: component.type,
      width: component.absoluteBoundingBox?.width,
      height: component.absoluteBoundingBox?.height,
      backgroundColor: component.backgroundColor,
      children: component.children?.length || 0,
      hasPrototype: !!component.transitionNodeID,
      styles: {
        borderRadius: component.cornerRadius,
        opacity: component.opacity,
      },
      // Add more detailed specs as needed
    };
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Figma Make MCP server running on stdio');
  }
}

const server = new FigmaMakeServer();
server.run().catch(console.error);
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

interface ParsedCurl {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: any;
}

/**
 * Parse a curl command string and extract URL, method, headers, and body
 */
function parseCurl(curlCommand: string): ParsedCurl | null {
  try {
    // Remove extra whitespace and newlines
    const cleaned = curlCommand.trim().replace(/\s+/g, ' ');
    
    // Extract URL (look for http:// or https://)
    const urlMatch = cleaned.match(/https?:\/\/[^\s'"]+/);
    if (!urlMatch) {
      return null;
    }
    const url = urlMatch[0];

    // Extract method (default to GET if not specified)
    let method = 'GET';
    if (cleaned.includes('-X POST') || cleaned.includes('--request POST')) {
      method = 'POST';
    } else if (cleaned.includes('-X PUT') || cleaned.includes('--request PUT')) {
      method = 'PUT';
    } else if (cleaned.includes('-X DELETE') || cleaned.includes('--request DELETE')) {
      method = 'DELETE';
    } else if (cleaned.includes('-X PATCH') || cleaned.includes('--request PATCH')) {
      method = 'PATCH';
    }

    // Extract headers
    const headers: Record<string, string> = {};
    const headerMatches = cleaned.matchAll(/-H\s+['"]([^'"]+)['"]|--header\s+['"]([^'"]+)['"]/g);
    for (const match of headerMatches) {
      const headerValue = match[1] || match[2];
      const [key, ...valueParts] = headerValue.split(':');
      if (key && valueParts.length > 0) {
        headers[key.trim()] = valueParts.join(':').trim();
      }
    }

    // Extract body data
    let body: any = undefined;
    const dataMatch = cleaned.match(/-d\s+['"]([^'"]+)['"]|--data\s+['"]([^'"]+)['"]|--data-raw\s+['"]([^'"]+)['"]/);
    if (dataMatch) {
      const dataString = dataMatch[1] || dataMatch[2] || dataMatch[3];
      try {
        body = JSON.parse(dataString);
      } catch {
        body = dataString;
      }
    }

    return { url, method, headers, body };
  } catch (error) {
    console.error('Error parsing curl command:', error);
    return null;
  }
}

/**
 * Validate API endpoint by making a test request
 */
async function validateApiEndpoint(parsedCurl: ParsedCurl): Promise<{ valid: boolean; error?: string }> {
  try {
    // Validate URL format
    try {
      new URL(parsedCurl.url);
    } catch {
      return { valid: false, error: 'Invalid URL format' };
    }

    // Make a test request with timeout
    const config: any = {
      method: parsedCurl.method,
      url: parsedCurl.url,
      headers: {
        ...parsedCurl.headers,
        'User-Agent': 'DynamicData-Validator/1.0',
      },
      timeout: 10000, // 10 second timeout
      validateStatus: (status: number) => status < 500, // Accept any status < 500 as valid
    };

    if (parsedCurl.body && (parsedCurl.method === 'POST' || parsedCurl.method === 'PUT' || parsedCurl.method === 'PATCH')) {
      config.data = parsedCurl.body;
    }

    const response = await axios(config);
    
    // If we get a response (even if it's an error status), the endpoint is reachable
    return { valid: true };
  } catch (error: any) {
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return { valid: false, error: 'Cannot reach API endpoint. Connection refused or host not found.' };
    } else if (error.code === 'ETIMEDOUT' || error.message?.includes('timeout')) {
      return { valid: false, error: 'API endpoint request timed out.' };
    } else if (error.response) {
      // Got a response, so endpoint is reachable (even if it returned an error)
      return { valid: true };
    } else {
      return { valid: false, error: `API validation failed: ${error.message}` };
    }
  }
}

/**
 * Create dynamic data entry
 */
export const createDynamicData = async (req: any, res: Response) => {
  try {
    const prompts = req.body;

    if(!prompts || prompts.length === 0) {
      res.status(400).json({ 
        message: 'Prompts are required.',
        data: null
      });
      return;
    }

    for (const prompt of prompts) {
      if (!prompt.prompt || !prompt.apiCurl || !prompt.orgId) {
        res.status(400).json({ 
          message: 'Both prompt, apiCurl and orgId are required.',
          data: null
        });
        return;
      }
    }

    for (const prompt of prompts) {
      const org = await prisma.organization.findUnique({ where: { id: prompt.orgId } });
      if (!org) {
        res.status(404).json({ 
          message: 'Organization not found.',
          data: null
        });
        return;
      }
    }

    for (const prompt of prompts) {
      const parsedCurl = parseCurl(prompt.apiCurl);
      if (!parsedCurl) {
        res.status(400).json({ 
          message: 'Invalid curl command format. Please provide a valid curl command with a URL.',
          data: null
        });
        return;
      }

      const validation = await validateApiEndpoint(parsedCurl);
      if (!validation.valid) {
        res.status(400).json({ 
          message: `API validation failed: ${validation.error}`,
          data: null
        });
        return;
      }
    }

    const user: any = req?.user;

    if (!user) {
      res.status(401).json({ 
        message: 'Unauthorized. Please login to continue.',
        data: null
      });
      return;
    }

    //
    for (let i = 0; i < prompts.length; i++) {
      const prompt = prompts[i];
      const dynamicData = await prisma.dynamicData.create({
        data: {
          prompt: prompt.prompt,
          apiCurl: prompt.apiCurl,
          orgId: prompt.orgId,
          userId: user?.id as string,
        },
        include: {
          organization: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }); 
      prompts[i] = dynamicData;
    }

    res.status(201).json({
      message: 'Dynamic data created successfully',
      data: prompts.map((prompt: any) => ({
        prompt: prompt.prompt,
        apiCurl: prompt.apiCurl,
        orgId: prompt.orgId
      })),
    });

  } catch (error: any) {
    console.error('Error creating dynamic data:', error);
    res.status(500).json({ 
      message: 'Internal server error.',
      data: null,
      error: error.message 
    });
  }
};

/**
 * Get all dynamic data entries (optionally filtered by orgId)
 */
export const getDynamicData = async (req: any, res: Response) => {
  try {
    const user = req.user;
    const { orgId } = req.query;

    // Build where clause
    const where: any = {};
    
    // If user is not admin, only show their org's data
    if (user && user.role !== 'Admin') {
      where.orgId = user.orgId;
    } else if (orgId) {
      where.orgId = orgId;
    }

    const dynamicDataList = await prisma.dynamicData.findMany({
      where,
      include: {
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.status(200).json({
      message: `Successfully retrieved ${dynamicDataList.length} dynamic data entries`,
      data: dynamicDataList,
    });
  } catch (error: any) {
    console.error('Error fetching dynamic data:', error);
    res.status(500).json({ 
      message: 'Internal server error.',
      error: error.message 
    });
  }
};

/**
 * Get a single dynamic data entry by ID
 */
export const getDynamicDataById = async (req: any, res: Response) => {
  try {
    const { orgId } = req.query;

    const dynamicData = await prisma.dynamicData.findMany({
      where: { orgId }
    });

    if (!dynamicData || dynamicData.length === 0) {
      res.status(404).json({ 
        message: 'Dynamic data not found.' 
      });
      return;
      
    } else{
      res.status(200).json({
        message: 'Dynamic data retrieved successfully',
        data: dynamicData
      });
    }
  } catch (error: any) {
    console.error('Error fetching dynamic data:', error);
    res.status(500).json({ 
      message: 'Internal server error.',
      error: error.message 
    });
  }
};

/**
 * Update dynamic data entry
 */
export const updateDynamicData = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { prompt, apiCurl } = req.body;
    const user = req.user;

    // Check if entry exists
    const existing = await prisma.dynamicData.findUnique({
      where: { id },
    });

    if (!existing) {
      res.status(404).json({ 
        message: 'Dynamic data not found.' 
      });
      return;
    }

    // Check permissions
    if (user && user.role !== 'Admin' && existing.orgId !== user.orgId) {
      res.status(403).json({ 
        message: 'Access denied. You do not have permission to update this data.' 
      });
      return;
    }

    // If apiCurl is being updated, validate it
    if (apiCurl) {
      const parsedCurl = parseCurl(apiCurl);
      if (!parsedCurl) {
        res.status(400).json({ 
          message: 'Invalid curl command format. Please provide a valid curl command with a URL.' 
        });
        return;
      }

      const validation = await validateApiEndpoint(parsedCurl);
      if (!validation.valid) {
        res.status(400).json({ 
          message: `API validation failed: ${validation.error}`,
          details: {
            url: parsedCurl.url,
            method: parsedCurl.method
          }
        });
        return;
      }
    }

    // Update the entry
    const updateData: any = {};
    if (prompt !== undefined) updateData.prompt = prompt;
    if (apiCurl !== undefined) updateData.apiCurl = apiCurl;

    const updated = await prisma.dynamicData.update({
      where: { id },
      data: updateData,
      include: {  
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    res.status(200).json({
      message: 'Dynamic data updated successfully',
      data: updated,
    });
  } catch (error: any) {
    console.error('Error updating dynamic data:', error);
    res.status(500).json({ 
      message: 'Internal server error.',
      error: error.message 
    });
  }
};

/**
 * Delete dynamic data entry
 */
export const deleteDynamicData = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user;

    // Check if entry exists
    const existing = await prisma.dynamicData.findUnique({
      where: { id },
    });

    if (!existing) {
      res.status(404).json({ 
        message: 'Dynamic data not found.' 
      });
      return;
    }

    // Check permissions
    if (user && user.role !== 'Admin' && existing.orgId !== user.orgId) {
      res.status(403).json({ 
        message: 'Access denied. You do not have permission to delete this data.' 
      });
      return;
    }

    await prisma.dynamicData.delete({
      where: { id },
    });

    res.status(200).json({
      message: 'Dynamic data deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting dynamic data:', error);
    res.status(500).json({ 
      message: 'Internal server error.',
      error: error.message 
    });
  }
};


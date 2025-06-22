import { AIResponse } from "../interfaces";

export const getAIResponse = async (message: string, orgId: string, aiOrgId: number, threadId: string, agentsOnline: any) => {
  try {
    const url = `${process.env.NODE_AI_URL}/api/organisation_chatbot`;

    let agents_available=false;
    let available_agents = [];

    if(agentsOnline.length > 0) {
      agents_available = true;
      available_agents = agentsOnline
    }
    const requestBody = JSON.stringify({ organisation_id: aiOrgId, user_query: message, agents_available, available_agents  });

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: requestBody,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error: ${response.status} - ${errorText}`);
    }

    const aiResponse = await response.json() as AIResponse;
    return aiResponse;

  } catch (error) {
    console.error("Error fetching AI response:", error);
    throw new Error("AI response failed");
  }
};

export const sendOrganizationDetails = async (data: any, organisationId: any) => {
  try {
    let url = `${process.env.NODE_AI_URL}/api/organisation_database/?organisation_id=${organisationId}`;

    if (!organisationId)
      url = `${process.env.NODE_AI_URL}/api/organisation_database`;

    const organization_details = { data };
    const requestBody = JSON.stringify({ organisation_data: organization_details });

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: requestBody,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error: ${response.status} - ${errorText}`);
    }

    return (await response.json()) as any;
  } catch (error) {
    console.error("Error sening organization detials", error);
    throw new Error("Error sening organization detials");
  }
};

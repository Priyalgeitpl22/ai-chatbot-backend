import { AIResponse } from "../interfaces";

export const getAIResponse = async (message: string, orgId: string, aiOrgId: number, threadId: string, faqs: any, openAiKey: string) => {
  try {
    const url = `${process.env.NODE_AI_URL}/api/organisation_chatbot`;
    console.log("openAiKey", openAiKey);

    // let agents_available=false;
    // let available_agents = [];

    // if(agentsOnline.length > 0) {
    //   agents_available = true;
    //   available_agents = agentsOnline
    // }
    const requestBody = JSON.stringify({ organisation_id: aiOrgId, user_query: message, faqs: faqs, openAiKey: openAiKey });

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
    let url = `${process.env.NODE_AI_URL}/api/organisation_database`;
    const organization_details = { data };
    const requestBody = JSON.stringify({ organisation_data: organization_details,organisation_id:organisationId || null });

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

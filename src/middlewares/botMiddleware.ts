import { AIResponse } from "../interfaces";

export const getAIResponse = async (message: string, organisationId=123) => {
  try {
    const url = `http://44.208.33.109/api/organisation_chatbot/?organisation_id=${organisationId}`;

    const requestBody = JSON.stringify({ user_query: message });
    console.log("Sending request:", url, requestBody);

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
    let url = `http://44.208.33.109/api/organisation_database/?organisation_id=${organisationId}`;

    if(!organisationId)
      url = `http://44.208.33.109/api/organisation_database`;

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

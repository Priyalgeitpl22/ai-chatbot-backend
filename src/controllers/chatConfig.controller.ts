import { PrismaClient } from "@prisma/client";
import { Request, Response } from "express";

const prisma = new PrismaClient();

export const getChatConfig = async (req: Request, res: Response): Promise<any> => {
    try {
        const orgId = (req.query.orgId) as string;
        const config = await prisma.chatConfig.findFirst({
            where:{
                orgId: orgId
            }
        });

        if (!config) {
            return res.status(404).json({ code: 404, message: "Chat configuration not found" });
        }

        res.status(200).json({ code: 200, data: config, message: "Success" });
    } catch (err) {
        console.error("Error fetching chat config:", err);
        res.status(500).json({ code: 500, message: "Internal Server Error" });
    }
};

export const updateChatConfig = async (req: Request, res: Response) => {
    try {
        const configData = req.body;

        const existingConfig = await prisma.chatConfig.findFirst();
        let updatedConfig;

        if (existingConfig) {
            updatedConfig = await prisma.chatConfig.update({
                where: { id: existingConfig.id },
                data: configData
            });
        } else {
            updatedConfig = await prisma.chatConfig.create({
                data: {...configData, socketServer: process.env.SOCKET_SERVER_URL}
            });
        }

        res.status(200).json({ code: 200, data: updatedConfig, message: "Chat configuration updated successfully" });
    } catch (err) {
        console.error("Error updating chat config:", err);
        res.status(500).json({ code: 500, message: "Internal Server Error" });
    }
};

export const getChatScript = async (req: Request, res: Response): Promise<void> => {
    try {
        const config = await prisma.chatConfig.findFirst();

        if (!config) {
            res.status(404).send("// Chat configuration not found");
            return;
        }

        const script = `
        <script src="http://localhost:5003/socket.io/socket.io.js"></script>
        <script type="text/javascript">
            (function () {
                var socketScript = document.createElement("script");
                socketScript.src = "http://localhost:5003/socket.io/socket.io.js";
                socketScript.async = true;
                socketScript.onload = function () {
                    var chatWidgetScript = document.createElement("script");
                    chatWidgetScript.src = "http://localhost:5501/chat-widget.js"; 
                    chatWidgetScript.async = true;
                    chatWidgetScript.onload = function () {
                        if (typeof ChatWidget !== "undefined") {
                            ChatWidget.init({
                                elementId: "chat-widget",
                                orgId: ${config.aiOrgId},
                                allowNameEmail: ${config.allowNameEmail},
                                allowFileUpload: ${config.allowFileUpload},
                                allowEmojis: ${config.allowEmojis},
                                position: "${config.position}",
                                iconColor: "${config.iconColor}",
                                chatWindowColor: "${config.chatWindowColor}",
                                fontColor: "${config.fontColor}",
                                availability: ${config.availability},
                                socketServer: "http://localhost:5003/"
                            });
                        }
                    };
                    document.body.appendChild(chatWidgetScript);
                };
                document.body.appendChild(socketScript);
            })();
            </script>
        <div id="chat-widget"></div>
        `;

        res.setHeader("Content-Type", "application/javascript");
        res.status(200).json({code: 200, data: script, message: 'Script fetched successfully!'});
    } catch (err) {
        console.error("Error generating chat script:", err);
        res.status(500).send("// Internal Server Error");
    }
};


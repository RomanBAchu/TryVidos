using Microsoft.AspNetCore.SignalR;

namespace AMBE.Hubs
{
    // Это "диспетчер", который рулит сообщениями и звонками
    public class ChatHub : Hub
    {
        // 1. Обычный чат: пересылка текста всем
        public async Task SendMessage(string user, string message)
        {
            await Clients.All.SendAsync("ReceiveMessage", user, message);
        }

        // 2. ЛОГИКА ДЛЯ ЗВОНКОВ (Сигналинг)
        // Когда один хочет позвонить, он шлет свои данные (offer) другому
        public async Task SendSignal(string signal, string targetConnectionId)
        {
            await Clients.Client(targetConnectionId).SendAsync("ReceiveSignal", signal, Context.ConnectionId);
        }

        // Уведомление, когда кто-то зашел в сеть
        public override async Task OnConnectedAsync()
        {
            await Clients.All.SendAsync("UserConnected", Context.ConnectionId);
            await base.OnConnectedAsync();
        }
    }
}

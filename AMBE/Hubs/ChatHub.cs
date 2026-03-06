using Microsoft.AspNetCore.SignalR;
using System.Collections.Concurrent;

namespace AMBE.Hubs
{
    public class ChatHub : Hub
    {
        private static readonly ConcurrentDictionary<string, string> _users = new();

        public async Task SendMessage(string user, string message) =>
            await Clients.All.SendAsync("ReceiveMessage", user, message);

        public async Task SendSignal(string signal, string target) =>
            await Clients.Client(target).SendAsync("ReceiveSignal", signal, Context.ConnectionId);

        public override async Task OnConnectedAsync()
        {
            await Clients.Caller.SendAsync("UserList", _users.Keys.ToList());
            _users.TryAdd(Context.ConnectionId, "");
            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception? ex)
        {
            _users.TryRemove(Context.ConnectionId, out _);
            await Clients.All.SendAsync("UserLeft", Context.ConnectionId);
            await base.OnDisconnectedAsync(ex);
        }
    }
}

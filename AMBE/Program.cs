using AMBE.Hubs;
using AMBE.Components;

var builder = WebApplication.CreateBuilder(args);

// 1. Регистрация сервисов
builder.Services.AddRazorComponents()
    .AddInteractiveServerComponents();

builder.Services.AddSignalR();

builder.Services.AddCors(options => {
    options.AddDefaultPolicy(policy => {
        policy.AllowAnyHeader().AllowAnyMethod().SetIsOriginAllowed(_ => true).AllowCredentials();
    });
});

var app = builder.Build();

// 2. Настройка Middleware (ПОРЯДОК ВАЖЕН)
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Error", createScopeForErrors: true);
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseStaticFiles(); // Позволяет браузеру видеть webrtc.js
app.UseRouting();     // Включаем маршрутизацию перед антифорджери
app.UseAntiforgery();
app.UseCors();

// 3. Регистрация эндпоинтов
app.MapHub<ChatHub>("/chathub");

// ГЛАВНОЕ ИСПРАВЛЕНИЕ:
// Регистрируем App как основной компонент и разрешаем ему обрабатывать все запросы
app.MapRazorComponents<App>()
    .AddInteractiveServerRenderMode();

app.Run();

using AMBE.Hubs;
using AMBE.Components;
using Microsoft.AspNetCore.HttpLogging;

var builder = WebApplication.CreateBuilder(args);

// 1. Регистрация сервисов
builder.Services.AddRazorComponents()
    .AddInteractiveServerComponents();

builder.Services.AddSignalR();

// Добавляем логирование HTTP-запросов (полезно при отладке SignalR и CORS)
builder.Services.AddHttpLogging(logging =>
{
    logging.LoggingFields = HttpLoggingFields.All;
});

builder.Services.AddCors(options => {
    options.AddDefaultPolicy(policy => {
        // ВАЖНО: Для продакшена замените .SetIsOriginAllowed(_ => true) 
        // на .WithOrigins("https://your-domain.com")
        policy.AllowAnyHeader()
              .AllowAnyMethod()
              .SetIsOriginAllowed(_ => true)
              .AllowCredentials();
    });
});

var app = builder.Build();

// 2. Настройка Middleware
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Error", createScopeForErrors: true);
    app.UseHsts();
}
else
{
    // Включаем логирование запросов только в разработке
    app.UseHttpLogging();
}

app.UseHttpsRedirection();
app.UseStaticFiles();
app.UseRouting();
app.UseAntiforgery();
app.UseCors();

// 3. Регистрация эндпоинтов
app.MapHub<ChatHub>("/chathub");

app.MapRazorComponents<App>()
    .AddInteractiveServerRenderMode();

app.Run();

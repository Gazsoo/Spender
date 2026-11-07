using Spender.API.Extensions;

var builder = WebApplication.CreateBuilder(args);

// Configure services
builder.Services.AddSpenderServices(builder.Configuration);

var app = builder.Build();

// Configure application
app.ConfigureSpenderApp();

app.Run();

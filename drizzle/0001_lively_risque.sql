CREATE TABLE "product_recommendations" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"slug" varchar(160) NOT NULL,
	"name" varchar(255) NOT NULL,
	"category" varchar(32) NOT NULL,
	"context" text NOT NULL,
	"image_url" text NOT NULL,
	"href" text NOT NULL,
	"store_label" varchar(120) NOT NULL,
	"link_kind" varchar(32) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "product_recommendations_slug_idx" ON "product_recommendations" USING btree ("slug");
--> statement-breakpoint
INSERT INTO "product_recommendations" ("id", "slug", "name", "category", "context", "image_url", "href", "store_label", "link_kind", "is_active", "sort_order", "created_at", "updated_at") VALUES
('switch-oled', 'nintendo-switch-oled', 'Nintendo Switch OLED', 'videogames', 'Bom quando eu quero couch co-op rapido, biblioteca forte e algo facil de levar da mesa para a sala.', '/recommendations/switch-oled.svg', 'https://www.nintendo.com/us/store/products/nintendo-switch-oled-model-white-set/', 'Nintendo', 'external', true, 10, '2026-04-04T00:00:00.000Z', '2026-04-04T00:00:00.000Z'),
('ps5-slim', 'playstation-5-slim', 'PlayStation 5 Slim', 'videogames', 'Faz sentido quando eu quero algo mais premium no sofa, com desempenho estavel e catalogo forte para campanha.', '/recommendations/ps5-slim.svg', 'https://direct.playstation.com/en-us/buy-consoles/playstation5-console-model-group-slim', 'PlayStation', 'external', true, 20, '2026-04-04T00:00:00.000Z', '2026-04-04T00:00:00.000Z'),
('8bitdo-ultimate', '8bitdo-ultimate-bluetooth-controller', '8BitDo Ultimate Bluetooth Controller', 'perifericos', 'Controle confortavel para Switch e PC, com dock que deixa tudo carregado sem eu precisar lembrar de cabo.', '/recommendations/8bitdo-ultimate.svg', 'https://www.8bitdo.com/ultimate-bluetooth-controller/', '8BitDo', 'external', true, 30, '2026-04-04T00:00:00.000Z', '2026-04-04T00:00:00.000Z'),
('wave-3', 'elgato-wave-3', 'Elgato Wave:3', 'perifericos', 'Microfone simples de acertar, com audio limpo e software pratico para separar fontes durante a live.', '/recommendations/wave-3.svg', 'https://www.elgato.com/us/en/p/wave-3', 'Elgato', 'external', true, 40, '2026-04-04T00:00:00.000Z', '2026-04-04T00:00:00.000Z'),
('cloud-3-wireless', 'hyperx-cloud-iii-wireless', 'HyperX Cloud III Wireless', 'perifericos', 'Headset confortavel para sessoes longas, com som consistente e voz clara quando eu preciso abrir call.', '/recommendations/cloud-3-wireless.svg', 'https://hyperx.com/products/hyperx-cloud-iii-wireless-gaming-headset', 'HyperX', 'external', true, 50, '2026-04-04T00:00:00.000Z', '2026-04-04T00:00:00.000Z'),
('stream-deck-mk2', 'elgato-stream-deck-mk2', 'Elgato Stream Deck MK.2', 'acessorios', 'Atalho fisico para cenas, efeitos e comandos, sem me obrigar a sair do jogo toda hora.', '/recommendations/stream-deck-mk2.svg', 'https://www.elgato.com/us/en/p/stream-deck-mk-2-black', 'Elgato', 'external', true, 60, '2026-04-04T00:00:00.000Z', '2026-04-04T00:00:00.000Z'),
('ugreen-dock', 'ugreen-revodok-usb-c-hub', 'UGREEN Revodok USB-C Hub', 'acessorios', 'Resolve porta, captura e energia em um ponto so, o que ajuda muito quando o setup comeca a crescer.', '/recommendations/ugreen-dock.svg', 'https://www.ugreen.com/collections/usb-c-hub', 'UGREEN', 'external', true, 70, '2026-04-04T00:00:00.000Z', '2026-04-04T00:00:00.000Z'),
('litra-glow', 'logitech-litra-glow', 'Logitech Litra Glow', 'acessorios', 'Luz pequena e facil de posicionar para melhorar camera sem comer metade da bancada.', '/recommendations/litra-glow.svg', 'https://www.logitechg.com/en-us/products/lighting/litra-glow.946-000001.html', 'Logitech G', 'external', true, 80, '2026-04-04T00:00:00.000Z', '2026-04-04T00:00:00.000Z');

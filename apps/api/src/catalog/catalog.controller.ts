import { Controller, Get, Param, Query } from "@nestjs/common";
import { CatalogService, BookListQuery } from "./catalog.service";

@Controller()
export class CatalogController {
  constructor(private catalog: CatalogService) {}

  @Get("books")
  list(@Query() query: BookListQuery) {
    return this.catalog.listBooks({
      ...query,
      page: query.page ? Number(query.page) : undefined,
      pageSize: query.pageSize ? Number(query.pageSize) : undefined,
    });
  }

  @Get("books/:slug")
  get(@Param("slug") slug: string) {
    return this.catalog.getBookBySlug(slug);
  }

  @Get("authors/:id")
  author(@Param("id") id: string) {
    return this.catalog.getAuthor(id);
  }

  @Get("categories")
  categories() {
    return this.catalog.listCategories();
  }

  @Get("home")
  home() {
    return this.catalog.homepage();
  }
}
